import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Info,
  Loader2,
  Palmtree,
  Plus,
  Printer,
  Send,
  Trash2,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Company,
  Employee,
  EmployeeVacationRecord,
  EmployeeVacationStatus,
  Job,
  PayrollEntry,
  PayrollParameters,
} from '../../types/database';
import type { CreateEmployeeVacationInput } from '../../context/services/employeeHrService';
import {
  analyzeEmployeeVacationCycles,
  buildDefaultCompanyPayrollParameters,
  estimateVacationFinancials,
  formatIsoDateBR,
  validateVacationRequest,
  type VacationCyclePeriod,
} from '../../utils/payrollCalculator';
import { printVacationNoticeAndReceipt } from '../../utils/payroll/vacationNoticeHtml';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const VACATION_STATUS_META: Record<
  EmployeeVacationStatus,
  { label: string; className: string }
> = {
  requested: { label: 'Solicitada', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  approved: { label: 'Aprovada', className: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  scheduled: { label: 'Agendada', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  in_progress: { label: 'Em Gozo', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  completed: { label: 'Concluída', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  canceled: { label: 'Cancelada', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  rejected: { label: 'Recusada', className: 'bg-red-50 text-red-700 border-red-200' },
};

interface EmployeeVacationsTabProps {
  employee: Employee;
  job?: Job;
  manager?: Employee;
  company?: Company | null;
  vacations: EmployeeVacationRecord[];
  payrollEntries: PayrollEntry[];
  payrollParameters?: PayrollParameters;
  isSelfServiceView?: boolean;
  onSaveEmployeePatch: (patch: Partial<Employee>, successMessage: string) => Promise<void>;
  onCreateVacation: (input: CreateEmployeeVacationInput) => Promise<EmployeeVacationRecord>;
  onUpdateVacation: (
    vacationId: string,
    patch: Partial<
      Omit<EmployeeVacationRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
    > & { status?: EmployeeVacationStatus }
  ) => Promise<EmployeeVacationRecord>;
  onDeleteVacation: (vacationId: string) => Promise<void>;
  onLaunchToPayroll: (vacationId: string) => Promise<PayrollEntry>;
}

function getSuggestedStartDateIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 35);
  // Avança se cair em sexta (5), sábado (6) ou domingo (0) para respeitar Art. 134 §3º
  while (d.getUTCDay() === 5 || d.getUTCDay() === 6 || d.getUTCDay() === 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export const EmployeeVacationsTab: React.FC<EmployeeVacationsTabProps> = ({
  employee,
  job,
  manager,
  company = null,
  vacations,
  payrollEntries,
  payrollParameters,
  isSelfServiceView = false,
  onSaveEmployeePatch,
  onCreateVacation,
  onUpdateVacation,
  onDeleteVacation,
  onLaunchToPayroll,
}) => {
  const resolvedParams = useMemo(
    () => payrollParameters || buildDefaultCompanyPayrollParameters(employee.tenant_id),
    [payrollParameters, employee.tenant_id]
  );

  const isPj = employee.contract_type === 'pj';
  const currentCompetence = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const baseSalary = Number(
    (isPj ? employee.pj_monthly_value ?? employee.salary_override : employee.salary_override) ??
      job?.base_salary ??
      0
  );

  const employeeVacations = useMemo(
    () =>
      [...vacations]
        .filter((v) => v.employee_id === employee.id)
        .sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [vacations, employee.id]
  );

  const summary = useMemo(
    () =>
      analyzeEmployeeVacationCycles({
        employee,
        competence: currentCompetence,
        existingEntries: payrollEntries,
        vacationRecords: employeeVacations,
      }),
    [employee, currentCompetence, payrollEntries, employeeVacations]
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedCycleLabel, setSelectedCycleLabel] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getSuggestedStartDateIso());
  const [daysTaken, setDaysTaken] = useState<number>(30);
  const [soldDays, setSoldDays] = useState<number>(0);
  const [unjustifiedAbsences, setUnjustifiedAbsences] = useState<number>(0);
  const [competence, setCompetence] = useState<string>(() => getSuggestedStartDateIso().slice(0, 7));
  const [advance13th, setAdvance13th] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updatingCutoff, setUpdatingCutoff] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const activeCycle: VacationCyclePeriod | null = useMemo(() => {
    if (selectedCycleLabel) {
      const matched = summary.cycles.find((c) => c.label === selectedCycleLabel);
      if (matched) return matched;
    }
    return summary.recommendedCycle || summary.cycles[summary.cycles.length - 1] || null;
  }, [selectedCycleLabel, summary]);

  const validation = useMemo(
    () =>
      validateVacationRequest({
        contractType: isPj ? 'pj' : 'clt',
        cycle: activeCycle,
        startDate,
        daysTaken,
        soldDays,
        unjustifiedAbsences,
        existingCycleRecords: employeeVacations,
        companyParams: resolvedParams,
      }),
    [
      isPj,
      activeCycle,
      startDate,
      daysTaken,
      soldDays,
      unjustifiedAbsences,
      employeeVacations,
      resolvedParams,
    ]
  );

  const financialEstimate = useMemo(
    () =>
      estimateVacationFinancials({
        baseSalary,
        daysTaken,
        soldDays,
        doubledDays: validation.doubledDays,
        dependentsCount: employee.dependents_count ?? 0,
        companyParams: resolvedParams,
      }),
    [
      baseSalary,
      daysTaken,
      soldDays,
      validation.doubledDays,
      employee.dependents_count,
      resolvedParams,
    ]
  );

  const openModalForCycle = (cycle?: VacationCyclePeriod | null) => {
    const target = cycle || summary.recommendedCycle || summary.cycles[0] || null;
    const suggestedStart = getSuggestedStartDateIso();
    setSelectedCycleLabel(target?.label || '');
    setStartDate(suggestedStart);
    setCompetence(suggestedStart.slice(0, 7));
    setDaysTaken(Math.min(30, Math.max(5, target?.remainingDays || 30)));
    setSoldDays(0);
    setUnjustifiedAbsences(0);
    setAdvance13th(false);
    setNotes('');
    setShowModal(true);
  };

  const handleSubmitVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle || !validation.valid) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      // Toda solicitação criada nasce como 'requested' e exige aprovação explícita do Gestor/RH
      await onCreateVacation({
        employee_id: employee.id,
        acquisitive_period_label: activeCycle.label,
        acquisitive_start: activeCycle.acquisitiveStart,
        acquisitive_end: activeCycle.acquisitiveEnd,
        concessive_limit: activeCycle.concessiveLimit,
        start_date: startDate,
        end_date: validation.endDate,
        days_taken: daysTaken,
        sold_days: soldDays,
        doubled_days: validation.doubledDays,
        fraction_number: validation.fractionNumber,
        unjustified_absences: unjustifiedAbsences,
        notice_date: validation.noticeDueDate || null,
        payment_due_date: validation.paymentDueDate || null,
        competence: competence || startDate.slice(0, 7),
        payroll_entry_id: null,
        advance_13th_requested: advance13th,
        status: 'requested',
        estimated_gross_amount: financialEstimate.grossVacationAmount,
        estimated_third_amount: financialEstimate.constitutionalThirdAmount,
        estimated_abono_amount: financialEstimate.totalAbonoAmount,
        estimated_double_amount: financialEstimate.doubleAmount,
        notes: notes.trim() || null,
        approved_by: null,
        approved_at: null,
      });
      setShowModal(false);
      setFeedback({
        type: 'success',
        message: `Solicitação de férias registrada e enviada para aprovação de ${
          manager?.full_name || 'Gestor Direto / RH'
        }!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao registrar solicitação de férias.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionLaunchPayroll = async (vac: EmployeeVacationRecord) => {
    if (
      vac.payroll_entry_id &&
      !window.confirm(
        `Estas férias já estão integradas à competência ${vac.competence || vac.start_date.slice(0, 7)}. Deseja atualizar o lançamento na Folha de Pagamento?`
      )
    ) {
      return;
    }

    setBusyId(vac.id);
    setFeedback(null);
    try {
      const savedEntry = await onLaunchToPayroll(vac.id);
      setFeedback({
        type: 'success',
        message: `Férias integradas com sucesso à Folha de Pagamento (${savedEntry.competence}) · Líquido da competência: ${formatBRL(Number(savedEntry.net_salary))}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao lançar férias na Folha.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleActionStatus = async (
    vac: EmployeeVacationRecord,
    nextStatus: EmployeeVacationStatus,
    successText: string
  ) => {
    setBusyId(vac.id);
    setFeedback(null);
    try {
      await onUpdateVacation(vac.id, {
        status: nextStatus,
        approved_at: nextStatus === 'approved' ? new Date().toISOString() : vac.approved_at ?? null,
      });
      setFeedback({ type: 'success', message: successText });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao atualizar status das férias.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (vac: EmployeeVacationRecord) => {
    if (!window.confirm('Deseja excluir este registro de férias?')) return;
    setBusyId(vac.id);
    setFeedback(null);
    try {
      await onDeleteVacation(vac.id);
      setFeedback({ type: 'success', message: 'Registro de férias removido.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao excluir registro.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSettledCutoffChange = async (cutoffIso: string | null) => {
    setUpdatingCutoff(true);
    try {
      await onSaveEmployeePatch(
        { last_vacation_settled_until: cutoffIso },
        'Histórico de quitação de períodos aquisitivos atualizado.'
      );
    } finally {
      setUpdatingCutoff(false);
    }
  };

  const nextConcessiveCycle = summary.openCycles[0] || summary.acquiringCycle;

  return (
    <div className="space-y-5">
      {/* Banner PJ vs CLT */}
      {isPj ? (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex items-start gap-3 text-purple-900">
          <Info className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-sm">Contrato PJ (Prestação de Serviços B2B)</p>
            <p className="leading-relaxed">
              Contratos PJ não são regidos pelos Arts. 129 a 145 da CLT (férias anuais remuneradas
              com 1/3 constitucional e abono pecuniário). Caso o contrato preveja recesso
              remunerado, utilize a gestão contratual do perfil.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header + Ação principal */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#082175] flex items-center gap-2">
                <Palmtree className="w-4 h-4 text-[#f5a90e]" />
                <span>Controle de Férias, Períodos Aquisitivos & Integração com Folha</span>
              </h3>
              <div className="w-12 h-0.5 bg-[#f5a90e] mt-1.5 rounded-full" />
              <p className="text-xs text-slate-500 mt-1.5">
                Fluxo formal: <strong>1. Solicitação</strong> →{' '}
                <strong>
                  2. Aprovação pelo Gestor ({manager?.full_name || 'Diretoria'}) / RH
                </strong>{' '}
                → <strong>3. Integração com a Folha</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openModalForCycle()}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#f5a90e]" />
              <span>Solicitar Férias</span>
            </button>
          </div>

          {feedback && (
            <div
              role="status"
              className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Saldo Disponível
              </p>
              <p className="text-2xl font-extrabold text-[#082175] mt-1">
                {summary.totalOpenDays} dia(s)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.totalOpenPeriodsCount} período(s) aquisitivo(s) em aberto
              </p>
            </div>

            <div
              className={`border rounded-xl p-4 shadow-xs ${
                summary.totalExpiredDays > 0
                  ? 'bg-rose-50/70 border-rose-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Férias Vencidas (Art. 137)
              </p>
              <p
                className={`text-2xl font-extrabold mt-1 ${
                  summary.totalExpiredDays > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {summary.totalExpiredDays} dia(s)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.totalExpiredDays > 0
                  ? 'Sujeitas a pagamento em dobro'
                  : 'Nenhum prazo concessivo vencido'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Gozado + Abono
              </p>
              <p className="text-2xl font-extrabold text-[#03416A] mt-1">
                {summary.totalTakenDays + summary.totalSoldDays} dia(s)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.totalTakenDays}d gozados · {summary.totalSoldDays}d vendidos (abono)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {nextConcessiveCycle?.status === 'acquiring'
                  ? 'Ciclo em Aquisição'
                  : 'Próximo Limite Concessivo'}
              </p>
              <p className="text-xl font-extrabold text-[#082175] mt-1">
                {nextConcessiveCycle
                  ? nextConcessiveCycle.status === 'acquiring'
                    ? `${nextConcessiveCycle.proportionalMonths || 0}/12 avos`
                    : formatIsoDateBR(nextConcessiveCycle.concessiveLimit)
                  : '-'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {nextConcessiveCycle
                  ? `Ciclo ${nextConcessiveCycle.label}`
                  : 'Admissão não informada'}
              </p>
            </div>
          </div>

          {/* Períodos Aquisitivos & Concessivos */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#082175]" />
                <h4 className="text-xs sm:text-sm font-bold text-[#082175]">
                  Períodos Aquisitivos & Concessivos (Arts. 130, 134 e 137 CLT)
                </h4>
              </div>

              {!isSelfServiceView && summary.cycles.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Quitar ciclos anteriores até:</span>
                  <select
                    aria-label="Último período aquisitivo quitado"
                    disabled={updatingCutoff}
                    value={employee.last_vacation_settled_until?.slice(0, 10) || ''}
                    onChange={(e) => void handleSettledCutoffChange(e.target.value || null)}
                    className="min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="">Padrão automático (24 meses)</option>
                    <option value="1900-01-01">Nenhum quitado (todos abertos)</option>
                    {summary.cycles
                      .filter((c) => c.status !== 'acquiring')
                      .map((c) => (
                        <option key={c.label} value={c.acquisitiveEnd}>
                          Quitado até {c.label} ({formatIsoDateBR(c.acquisitiveEnd)})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {summary.cycles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Informe a data de admissão do colaborador para apurar os períodos aquisitivos.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {summary.cycles.map((cycle) => {
                  const usedDays = cycle.takenDays + cycle.soldDays;
                  const pct = Math.min(100, Math.round((usedDays / Math.max(cycle.entitledDays, 1)) * 100));
                  const isExpired = cycle.status === 'expired_double';
                  const isOpen = cycle.status === 'open_concessive';
                  const isAcquiring = cycle.status === 'acquiring';

                  return (
                    <div
                      key={cycle.label}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                        isExpired
                          ? 'border-rose-200 bg-rose-50/40'
                          : isOpen
                          ? 'border-amber-200 bg-amber-50/40'
                          : isAcquiring
                          ? 'border-sky-200 bg-sky-50/30'
                          : 'border-slate-200 bg-slate-50/60'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-[#082175]">
                            Ciclo {cycle.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isExpired
                                ? 'bg-rose-600 text-white'
                                : isOpen
                                ? 'bg-amber-500 text-white'
                                : isAcquiring
                                ? 'bg-sky-100 text-[#082175]'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isExpired
                              ? 'Vencida · Art. 137'
                              : isOpen
                              ? 'No Prazo'
                              : isAcquiring
                              ? `Em Aquisição (${cycle.proportionalMonths}/12)`
                              : 'Quitada'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <p>
                            Aquisitivo: <strong>{formatIsoDateBR(cycle.acquisitiveStart)}</strong> a{' '}
                            <strong>{formatIsoDateBR(cycle.acquisitiveEnd)}</strong>
                          </p>
                          <p>
                            Limite Concessivo:{' '}
                            <strong className={isExpired ? 'text-rose-700' : ''}>
                              {formatIsoDateBR(cycle.concessiveLimit)}
                            </strong>
                          </p>
                        </div>

                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span>
                              Usado: {usedDays}d ({cycle.takenDays}d gozo + {cycle.soldDays}d abono)
                            </span>
                            <span className="font-bold text-[#082175]">
                              Saldo: {cycle.remainingDays}d
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isExpired ? 'bg-rose-600' : 'bg-[#082175]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {cycle.remainingDays > 0 && cycle.status !== 'acquiring' && (
                        <button
                          type="button"
                          onClick={() => openModalForCycle(cycle)}
                          className={`min-h-[44px] w-full rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isExpired
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-[#082175] hover:bg-[#0a2a8a] text-white'
                          }`}
                        >
                          Solicitar deste ciclo ({cycle.remainingDays}d)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Histórico de Férias Tiradas & Programadas */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#082175]">
                  Histórico de Férias Tiradas, Solicitadas & Programadas
                </h4>
                <p className="text-[11px] text-slate-500">
                  Aprovação, emissão do Aviso de Férias (Art. 135) e lançamento direto na Folha de
                  Pagamento.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                {employeeVacations.length} registro(s)
              </span>
            </div>

            {employeeVacations.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Nenhuma solicitação ou histórico formal registrado
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Clique em &ldquo;Solicitar Férias&rdquo; para agendar períodos respeitando a
                  Reforma Trabalhista e submeter à aprovação do Gestor / RH antes de lançar na Folha.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {employeeVacations.some((v) => v.status === 'requested') && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        <strong>Aprovação Obrigatória (Gestor / RH):</strong> Solicitações com status{' '}
                        <em>Solicitada</em> aguardam aprovação formal de{' '}
                        <strong>{manager?.full_name || 'Gestor / RH'}</strong> para habilitar o Aviso
                        de Férias (Art. 135 CLT) e o lançamento na Folha de Pagamento.
                      </span>
                    </div>
                  </div>
                )}
                {employeeVacations.map((vac) => {
                  const statusMeta = VACATION_STATUS_META[vac.status] || VACATION_STATUS_META.requested;
                  const isBusy = busyId === vac.id;
                  const totalGross =
                    Number(vac.estimated_gross_amount || 0) +
                    Number(vac.estimated_abono_amount || 0) +
                    Number(vac.estimated_double_amount || 0);

                  return (
                    <article
                      key={vac.id}
                      className="rounded-xl border border-slate-200 p-4 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-[#082175]">
                              {formatIsoDateBR(vac.start_date)} até {formatIsoDateBR(vac.end_date)}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700">
                              Ciclo {vac.acquisitive_period_label} · Fração {vac.fraction_number}
                            </span>
                          {vac.status === 'requested' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                              <Clock className="w-3 h-3" />
                              Aguardando Aprovação ({manager?.full_name || 'Gestor / RH'})
                            </span>
                          )}
                          {vac.approved_at && vac.status !== 'requested' && vac.status !== 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Aprovada pelo Gestor/RH em {formatIsoDateBR(vac.approved_at.slice(0, 10))}
                            </span>
                          )}
                          {vac.payroll_entry_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <FileSpreadsheet className="w-3 h-3" />
                              Integrado à Folha {vac.competence || vac.start_date.slice(0, 7)}
                            </span>
                          )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span>
                              Gozo: <strong>{vac.days_taken} dia(s)</strong>
                            </span>
                            {vac.sold_days > 0 && (
                              <span>
                                Abono Pecuniário: <strong>{vac.sold_days} dia(s)</strong>
                              </span>
                            )}
                            {vac.doubled_days > 0 && (
                              <span className="text-rose-700 font-semibold">
                                Dobra Art. 137: {vac.doubled_days}d
                              </span>
                            )}
                            {vac.payment_due_date && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#9F8548]" />
                                Pagar até {formatIsoDateBR(vac.payment_due_date)} (Art. 145)
                              </span>
                            )}
                            {totalGross > 0 && (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-[#082175]">
                                <Wallet className="w-3 h-3 text-[#9F8548]" />
                                Bruto est.: {formatBRL(totalGross)}
                              </span>
                            )}
                          </div>
                          {vac.notes && <p className="text-[11px] text-slate-500">{vac.notes}</p>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(vac.status === 'approved' ||
                            vac.status === 'scheduled' ||
                            vac.status === 'in_progress' ||
                            vac.status === 'completed') && (
                            <button
                              type="button"
                              onClick={() =>
                                printVacationNoticeAndReceipt({
                                  company,
                                  employee,
                                  job,
                                  vacation: vac,
                                })
                              }
                              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Aviso/Recibo CLT</span>
                            </button>
                          )}

                          {!isSelfServiceView && (
                            <>
                              {vac.status === 'requested' && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleActionStatus(
                                        vac,
                                        'approved',
                                        'Solicitação de férias aprovada pelo Gestor / RH.'
                                      )
                                    }
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Aprovar (Gestor / RH)</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void handleActionStatus(
                                        vac,
                                        'rejected',
                                        'Solicitação recusada.'
                                      )
                                    }
                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold cursor-pointer disabled:opacity-60"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Recusar</span>
                                  </button>
                                </>
                              )}

                              {(vac.status === 'approved' ||
                                vac.status === 'scheduled' ||
                                vac.status === 'in_progress') && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => void handleActionLaunchPayroll(vac)}
                                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                                >
                                  {isBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5 text-[#f5a90e]" />
                                  )}
                                  <span>
                                    {vac.payroll_entry_id
                                      ? 'Atualizar na Folha'
                                      : 'Lançar na Folha'}
                                  </span>
                                </button>
                              )}

                              {(vac.status === 'scheduled' || vac.status === 'in_progress') && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleActionStatus(
                                      vac,
                                      'completed',
                                      'Férias marcadas como concluídas.'
                                    )
                                  }
                                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer disabled:opacity-60"
                                >
                                  <CalendarCheck className="w-3.5 h-3.5" />
                                  <span>Concluir</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDelete(vac)}
                                aria-label="Excluir férias"
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-red-100 text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-60"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modal Solicitar / Programar Férias */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-5 text-xs">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
                  Conformidade CLT + Reforma Trabalhista (Lei 13.467/2017) · Sujeito a Aprovação Gestor/RH
                </p>
                <h3 className="text-lg font-bold text-[#082175]">
                  Solicitar Férias ({employee.full_name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Fechar modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVacation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Período Aquisitivo
                  </label>
                  <select
                    value={activeCycle?.label || ''}
                    onChange={(e) => setSelectedCycleLabel(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  >
                    {summary.cycles.map((c) => (
                      <option key={c.label} value={c.label}>
                        Ciclo {c.label} (Saldo: {c.remainingDays}d{' '}
                        {c.status === 'expired_double' ? '· Vencida' : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Início do Gozo (evite 2d antes DSR/Feriado)
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setStartDate(next);
                      if (next.length >= 7) setCompetence(next.slice(0, 7));
                    }}
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dias de Férias (5 a 30)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={daysTaken}
                    onChange={(e) => setDaysTaken(Math.min(30, Math.max(5, Number(e.target.value) || 5)))}
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Abono Pecuniário / Venda (0 a 10d)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={soldDays}
                    onChange={(e) => setSoldDays(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Faltas Injustificadas no Período (Art. 130)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={unjustifiedAbsences}
                    onChange={(e) =>
                      setUnjustifiedAbsences(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Competência Alvo da Folha
                  </label>
                  <input
                    type="month"
                    value={competence}
                    onChange={(e) => setCompetence(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 font-semibold text-[#082175] cursor-pointer">
                <input
                  type="checkbox"
                  checked={advance13th}
                  onChange={(e) => setAdvance13th(e.target.checked)}
                />
                <span>Solicitar adiantamento da 1ª parcela do 13º Salário (Lei nº 4.749/1965)</span>
              </label>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações sobre cobertura de equipe ou acordos..."
                  className="w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>

              {/* Validações CLT ao vivo */}
              {validation.errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-1 text-red-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Impedimentos Legais (CLT):
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {validation.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-1 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Alertas de Conformidade:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {validation.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview financeiro e prazos */}
              <div className="rounded-xl bg-[#082175] text-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-200">
                  <span>
                    Término: <strong className="text-white">{formatIsoDateBR(validation.endDate)}</strong>
                  </span>
                  <span>
                    Aviso (Art. 135):{' '}
                    <strong className="text-white">{formatIsoDateBR(validation.noticeDueDate)}</strong>
                  </span>
                  <span>
                    Pagamento (Art. 145):{' '}
                    <strong className="text-[#f5a90e]">
                      {formatIsoDateBR(validation.paymentDueDate)}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/15">
                  <div>
                    <span className="text-[10px] uppercase text-slate-300 block">Férias + 1/3</span>
                    <span className="font-mono font-bold text-sm">
                      {formatBRL(financialEstimate.grossVacationAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-300 block">
                      Abono Isento
                    </span>
                    <span className="font-mono font-bold text-sm text-[#f5a90e]">
                      {formatBRL(financialEstimate.totalAbonoAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-300 block">
                      INSS + IRRF est.
                    </span>
                    <span className="font-mono font-bold text-sm text-red-200">
                      -{formatBRL(financialEstimate.estimatedInss + financialEstimate.estimatedIrrf)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-emerald-300 block">
                      Líquido Estimado
                    </span>
                    <span className="font-mono font-bold text-base text-emerald-300">
                      {formatBRL(financialEstimate.estimatedNetAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !validation.valid}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Enviar Solicitação para Aprovação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
