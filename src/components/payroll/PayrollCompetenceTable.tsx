import React, { useMemo, useState } from 'react';
import {
  Employee,
  EmployeeBenefitRecord,
  EmployeeVacationRecord,
  Job,
  PayrollEntry,
  PayrollParameters,
  PayrollStatus,
} from '../../types/database';
import { analyzeEmployeeVacationCycles } from '../../utils/payrollCalculator';
import {
  AlertTriangle,
  Bus,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  FileText,
  Filter,
  HeartPulse,
  Loader2,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Utensils,
} from 'lucide-react';

interface PayrollCompetenceTableProps {
  competence: string;
  entries: PayrollEntry[];
  allPayrollEntries: PayrollEntry[];
  employees: Employee[];
  jobs: Job[];
  employeeVacations: EmployeeVacationRecord[];
  employeeBenefits: EmployeeBenefitRecord[];
  payrollParameters: PayrollParameters;
  onUpdateStatus: (entryId: string, status: PayrollStatus) => Promise<void>;
  onPreviewPayslip: (entry: PayrollEntry) => void;
  onEditEntry: (employeeId: string) => void;
  onDeleteEntry: (entry: PayrollEntry) => Promise<void>;
  onApproveVacation: (vacationId: string) => Promise<void>;
  onLaunchVacationToPayroll: (vacationId: string) => Promise<void>;
}

type QuickFilterMode = 'all' | 'with_events' | 'lei_15270_exempt' | 'vacation_alert';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDateBR = (iso?: string | null) => {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const STATUS_BADGE: Record<PayrollStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  closed: { label: 'Fechada', className: 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]' },
  paid: { label: 'Paga', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const NFSE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  awaiting_issue: { label: 'Aguardando NFS-e', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  issued: { label: 'NFS-e Emitida', className: 'bg-purple-50 text-purple-800 border-purple-200' },
  approved: { label: 'NFS-e Conferida', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  not_applicable: { label: 'Dispensada', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const PayrollCompetenceTable: React.FC<PayrollCompetenceTableProps> = ({
  competence,
  entries,
  allPayrollEntries,
  employees,
  jobs,
  employeeVacations,
  employeeBenefits,
  payrollParameters,
  onUpdateStatus,
  onPreviewPayslip,
  onEditEntry,
  onDeleteEntry,
  onApproveVacation,
  onLaunchVacationToPayroll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterMode>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyVacId, setBusyVacId] = useState<string | null>(null);

  // Férias solicitadas ou aprovadas para esta competência que ainda precisam de ação do Gestor/RH
  const competencePendingVacations = useMemo(() => {
    return employeeVacations.filter((v) => {
      const targetComp = v.competence || v.start_date.slice(0, 7);
      if (targetComp !== competence) return false;
      if (v.status === 'requested') return true;
      if ((v.status === 'approved' || v.status === 'scheduled') && !v.payroll_entry_id) return true;
      return false;
    });
  }, [employeeVacations, competence]);

  const enrichedRows = useMemo(() => {
    return entries.map((entry) => {
      const emp = employees.find((e) => e.id === entry.employee_id);
      const job = jobs.find((j) => j.id === emp?.job_id);
      const isPj = (entry.contract_type || emp?.contract_type || 'clt') === 'pj';
      const vacCycleSummary = !isPj
        ? analyzeEmployeeVacationCycles({
            employee: emp,
            competence,
            existingEntries: allPayrollEntries,
            vacationRecords: employeeVacations,
            excludeCompetence: competence,
          })
        : null;
      const activeBenefitsCount = employeeBenefits.filter(
        (b) => b.employee_id === entry.employee_id && b.status === 'active'
      ).length;
      const hasEvents =
        Number(entry.vacation_days || 0) > 0 ||
        Number(entry.vacation_sold_days || 0) > 0 ||
        (entry.leave_type && entry.leave_type !== 'none' && Number(entry.leave_days || 0) > 0) ||
        (entry.thirteenth_mode && entry.thirteenth_mode !== 'none') ||
        Number(entry.overtime_amount || 0) > 0;
      const isLei15270Exempt =
        !isPj && payrollParameters.apply_lei_15270 && Number(entry.irrf_amount || 0) === 0;
      const hasVacationAlert = Boolean(
        !isPj && vacCycleSummary && vacCycleSummary.expiredCycles.length > 0
      );

      return {
        entry,
        emp,
        job,
        isPj,
        vacCycleSummary,
        activeBenefitsCount,
        hasEvents,
        isLei15270Exempt,
        hasVacationAlert,
      };
    });
  }, [
    entries,
    employees,
    jobs,
    competence,
    allPayrollEntries,
    employeeVacations,
    employeeBenefits,
    payrollParameters.apply_lei_15270,
  ]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrichedRows.filter((row) => {
      if (q) {
        const nameMatch = (row.emp?.full_name || '').toLowerCase().includes(q);
        const roleMatch = (row.job?.title || row.emp?.pj_company_name || '').toLowerCase().includes(q);
        const deptMatch = (row.job?.department || '').toLowerCase().includes(q);
        if (!nameMatch && !roleMatch && !deptMatch) return false;
      }
      if (quickFilter === 'with_events') return row.hasEvents;
      if (quickFilter === 'lei_15270_exempt') return row.isLei15270Exempt;
      if (quickFilter === 'vacation_alert') return row.hasVacationAlert;
      return true;
    });
  }, [enrichedRows, searchTerm, quickFilter]);

  const handleVacationAction = async (vacId: string, action: 'approve' | 'launch') => {
    setBusyVacId(vacId);
    try {
      if (action === 'approve') {
        await onApproveVacation(vacId);
      } else {
        await onLaunchVacationToPayroll(vacId);
      }
    } finally {
      setBusyVacId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Fila de Férias Solicitadas / Aprovadas para a Competência */}
      {competencePendingVacations.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                Fluxo de Férias da Competência {competence} ({competencePendingVacations.length}{' '}
                pendência(s) de aprovação ou integração)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-800">
              CLT Arts. 134–145 · Aprovação Gestor/RH obrigatória antes da Folha
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {competencePendingVacations.map((vac) => {
              const emp = employees.find((e) => e.id === vac.employee_id);
              const manager = employees.find((e) => e.id === emp?.reports_to);
              const isBusy = busyVacId === vac.id;
              return (
                <div
                  key={vac.id}
                  className="bg-white border border-amber-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#082175]">
                        {emp?.full_name || 'Colaborador'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          vac.status === 'requested'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}
                      >
                        {vac.status === 'requested'
                          ? `Aguardando Aprovação (${manager?.full_name || 'Gestor/RH'})`
                          : 'Aprovada · Pronta p/ Folha'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Gozo: <strong>{formatDateBR(vac.start_date)}</strong> a{' '}
                      <strong>{formatDateBR(vac.end_date)}</strong> ({vac.days_taken}d
                      {vac.sold_days > 0 ? ` + ${vac.sold_days}d abono` : ''}) · Ciclo{' '}
                      {vac.acquisitive_period_label}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {vac.status === 'requested' ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleVacationAction(vac.id, 'approve')}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Aprovar (Gestor/RH)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleVacationAction(vac.id, 'launch')}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-[#f5a90e]" />
                        )}
                        <span>Integrar à Folha</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Principal: Lançamentos da Competência */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Cabeçalho + Barra de Busca e Filtros Legais */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#082175]">
                  Lançamentos da Competência ({competence})
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#082175] text-xs font-mono font-bold">
                  {filteredRows.length} / {entries.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vinculado em tempo real ao cadastro do colaborador, dependentes IRRF, pacote de
                benefícios (VT/VR/Saúde) e ciclos de férias CLT. Clique em{' '}
                <strong>Raio-X Legal</strong> para inspecionar a memória de cálculo.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar colaborador, cargo ou área..."
                className="w-full min-h-[38px] pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-800 outline-none focus:border-[#082175]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
              <Filter className="w-3 h-3" />
              Recorte rápido:
            </span>
            {(
              [
                { id: 'all', label: `Todos (${enrichedRows.length})` },
                {
                  id: 'with_events',
                  label: `Com Férias / Eventos (${enrichedRows.filter((r) => r.hasEvents).length})`,
                },
                {
                  id: 'lei_15270_exempt',
                  label: `Isentos IRRF · Lei 15.270 (${
                    enrichedRows.filter((r) => r.isLei15270Exempt).length
                  })`,
                },
                {
                  id: 'vacation_alert',
                  label: `Alerta Férias Art. 137 (${
                    enrichedRows.filter((r) => r.hasVacationAlert).length
                  })`,
                },
              ] as const
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setQuickFilter(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  quickFilter === pill.id
                    ? 'bg-[#082175] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {entries.length === 0
                ? `Nenhum lançamento encontrado para ${competence}`
                : 'Nenhum colaborador corresponde ao filtro selecionado'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {entries.length === 0
                ? 'Clique em Gerar Competência no topo para calcular CLT (PF) e PJ (NFS-e) em lote respeitando admissão, benefícios e férias aprovadas.'
                : 'Limpe a busca ou altere o recorte rápido para visualizar todos os lançamentos.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Colaborador & Vínculo</th>
                  <th className="py-3 px-3 text-left font-semibold">Jornada & Eventos CLT</th>
                  <th className="py-3 px-3 text-right font-semibold">Proventos / Bruto</th>
                  <th className="py-3 px-3 text-right font-semibold">Descontos & Tributação</th>
                  <th className="py-3 px-3 text-right font-semibold">Líquido a Pagar</th>
                  <th className="py-3 px-4 text-right font-semibold">Situação & Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => {
                  const {
                    entry,
                    emp,
                    job,
                    isPj,
                    vacCycleSummary,
                    hasVacationAlert,
                    isLei15270Exempt,
                  } = row;
                  const isExpanded = expandedId === entry.id;
                  const currentEmpRegime = emp?.contract_type || 'clt';
                  const hasRegimeMismatch = Boolean(
                    emp && entry.contract_type && currentEmpRegime !== entry.contract_type
                  );
                  const nfseBadge =
                    NFSE_STATUS_BADGE[entry.nfse_status || 'awaiting_issue'] ||
                    NFSE_STATUS_BADGE.awaiting_issue;
                  const contractualBase = Number(
                    emp?.salary_override ?? job?.base_salary ?? entry.base_salary ?? 0
                  );
                  const vacationDays = Number(entry.vacation_days || 0);
                  const soldDays = Number(entry.vacation_sold_days || 0);
                  const leaveDays = Number(entry.leave_days || 0);
                  const benefitDeductions =
                    Number(entry.vt_discount_amount || 0) +
                    Number(entry.vr_discount || 0) +
                    Number(entry.other_discounts || 0);

                  return (
                    <React.Fragment key={entry.id}>
                      <tr
                        className={`transition-colors ${
                          isExpanded ? 'bg-slate-50/90' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* 1. Colaborador & Vínculo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isPj
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-[#082175]/10 text-[#082175]'
                              }`}
                            >
                              {(emp?.full_name || 'C').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[#082175] truncate">
                                  {emp?.full_name || 'Colaborador'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    isPj
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]'
                                  }`}
                                >
                                  {isPj ? 'PJ' : 'CLT'}
                                </span>
                                {hasRegimeMismatch && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                    Cadastro: {currentEmpRegime.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {isPj
                                  ? emp?.pj_company_name || 'Prestador PJ'
                                  : `${job?.title || 'Cargo'}${
                                      job?.department ? ` · ${job.department}` : ''
                                    }`}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>Adm.: {formatDateBR(emp?.hire_date)}</span>
                                {!isPj && Number(entry.dependents_count || 0) > 0 && (
                                  <span>· {entry.dependents_count} dep. IRRF</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Jornada & Eventos CLT */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-slate-800">
                                {entry.worked_days}d trab.
                              </span>
                              {vacationDays > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                  Férias {vacationDays}d
                                  {soldDays > 0 ? ` + ${soldDays}d Abono` : ''}
                                  {Number(entry.vacation_doubled_days || 0) > 0
                                    ? ' · Dobra Art. 137'
                                    : ''}
                                </span>
                              )}
                              {leaveDays > 0 && entry.leave_type && entry.leave_type !== 'none' && (
                                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-[#082175] text-[10px] font-bold">
                                  Licença {leaveDays}d
                                </span>
                              )}
                              {entry.thirteenth_mode && entry.thirteenth_mode !== 'none' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  13º Salário
                                </span>
                              )}
                            </div>

                            {!isPj && (
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                {hasVacationAlert ? (
                                  <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                                    <AlertTriangle className="w-3 h-3" />
                                    {vacCycleSummary?.expiredCycles.length} ciclo(s) vencido(s) (Art.
                                    137 CLT)
                                  </span>
                                ) : vacCycleSummary && vacCycleSummary.totalOpenPeriodsCount > 0 ? (
                                  <span className="text-slate-500">
                                    Ciclo concessivo aberto ({vacCycleSummary.totalOpenPeriodsCount})
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    Base contratual: {formatBRL(contractualBase)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Proventos / Bruto */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-mono font-bold text-slate-900">
                            {formatBRL(Number(entry.gross_salary))}
                          </div>
                          {!isPj && (
                            <div className="text-[10px] text-slate-500 space-x-1">
                              {vacationDays > 0 ? (
                                <span className="text-amber-800 font-medium">
                                  Férias+1/3: {formatBRL(Number(entry.vacation_amount || 0))}
                                </span>
                              ) : (
                                <span>Sal. prop.: {formatBRL(Number(entry.base_salary || 0))}</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 4. Descontos & Tributação */}
                        <td className="py-3.5 px-3 text-right">
                          {isPj ? (
                            <div className="inline-flex flex-col items-end gap-0.5">
                              <span
                                className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${nfseBadge.className}`}
                              >
                                {nfseBadge.label}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {Number(entry.total_discounts || 0) > 0
                                  ? `Retenções: -${formatBRL(Number(entry.total_discounts))}`
                                  : entry.nfse_number
                                  ? `NFS-e Nº ${entry.nfse_number}`
                                  : 'Sem retenção na fonte'}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-mono font-semibold text-rose-700">
                                -{formatBRL(Number(entry.total_discounts))}
                              </div>
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                <span className="text-[10px] font-mono text-slate-500">
                                  INSS -{formatBRL(Number(entry.inss_amount))}
                                </span>
                                {isLei15270Exempt ? (
                                  <span
                                    title="Isento de IRRF conforme Lei nº 15.270/2025 (até R$ 5.000,00)"
                                    className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold"
                                  >
                                    IRRF Isento · L15.270
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    · IRRF -{formatBRL(Number(entry.irrf_amount))}
                                  </span>
                                )}
                              </div>
                              {benefitDeductions > 0 && (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Benefícios: -{formatBRL(benefitDeductions)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Líquido a Pagar */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-mono font-extrabold text-emerald-700 text-xs sm:text-sm">
                            {formatBRL(Number(entry.net_salary))}
                          </div>
                          {!isPj && (
                            <div className="text-[10px] font-mono text-slate-400">
                              FGTS 8%: {formatBRL(Number(entry.fgts_amount))}
                            </div>
                          )}
                        </td>

                        {/* 6. Situação & Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                            <select
                              aria-label="Situação da folha"
                              value={entry.status}
                              onChange={(e) =>
                                void onUpdateStatus(entry.id, e.target.value as PayrollStatus)
                              }
                              className={`text-[11px] font-semibold rounded-lg border px-2 py-1 outline-none cursor-pointer ${
                                STATUS_BADGE[entry.status].className
                              }`}
                            >
                              <option value="draft">Rascunho</option>
                              <option value="closed">Fechada</option>
                              <option value="paid">Paga</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              title="Inspecionar Raio-X Legal & Vínculo com Perfil"
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-[#082175] text-white border-[#082175]'
                                  : 'bg-slate-50 text-[#082175] border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Raio-X</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onPreviewPayslip(entry)}
                              title={isPj ? 'Autorização NFS-e' : 'Holerite / Recibo CLT'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#082175] hover:bg-slate-50 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditEntry(entry.employee_id)}
                              title="Editar parâmetros do lançamento"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#082175] hover:bg-slate-50 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => void onDeleteEntry(entry)}
                              title="Excluir lançamento"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Gaveta Expandida: Raio-X do Funcionário & Conformidade Legal */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={6} className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                              {/* Coluna 1: Vínculo Cadastral & Benefícios do Perfil */}
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-[#082175] flex items-center gap-1.5">
                                    <UserCheck className="w-4 h-4 text-[#9F8548]" />
                                    Dados do Perfil & Benefícios Ativos
                                  </span>
                                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                    Sincronizado
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px] text-slate-600">
                                  <div className="flex justify-between">
                                    <span>Salário Contratual ({isPj ? 'Fee PJ' : 'CLT'}):</span>
                                    <strong className="font-mono text-slate-900">
                                      {formatBRL(contractualBase)}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Admissão / Dependentes IRRF:</span>
                                    <strong>
                                      {formatDateBR(emp?.hire_date)} ·{' '}
                                      {Number(entry.dependents_count || 0)} dep.
                                    </strong>
                                  </div>
                                  {!isPj && (
                                    <>
                                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                                        <span className="inline-flex items-center gap-1">
                                          <Bus className="w-3 h-3 text-[#082175]" />
                                          Vale-Transporte (Lei 7.418/85 · teto 6%):
                                        </span>
                                        <strong className="font-mono text-rose-700">
                                          {entry.vt_opted_in
                                            ? `-${formatBRL(Number(entry.vt_discount_amount || 0))}`
                                            : 'Não optante'}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="inline-flex items-center gap-1">
                                          <Utensils className="w-3 h-3 text-[#9F8548]" />
                                          VR / VA (PAT · Dec. 10.854/21):
                                        </span>
                                        <strong className="font-mono text-rose-700">
                                          -{formatBRL(Number(entry.vr_discount || 0))}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="inline-flex items-center gap-1">
                                          <HeartPulse className="w-3 h-3 text-emerald-600" />
                                          Saúde / Outros (Art. 458 §5º CLT):
                                        </span>
                                        <strong className="font-mono text-rose-700">
                                          -{formatBRL(Number(entry.other_discounts || 0))}
                                        </strong>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Coluna 2: Composição Legal de Proventos */}
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-[#082175] flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-[#9F8548]" />
                                    Memória de Proventos ({competence})
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-[#082175]">
                                    Bruto: {formatBRL(Number(entry.gross_salary))}
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px] text-slate-600">
                                  <div className="flex justify-between">
                                    <span>
                                      Salário Proporcional ({entry.worked_days}/30 dias):
                                    </span>
                                    <strong className="font-mono">
                                      {formatBRL(Number(entry.base_salary || 0))}
                                    </strong>
                                  </div>
                                  {vacationDays > 0 && (
                                    <>
                                      <div className="flex justify-between text-amber-900">
                                        <span>
                                          Férias Gozadas ({vacationDays}d) + 1/3 (Art. 7º XVII CF):
                                        </span>
                                        <strong className="font-mono">
                                          {formatBRL(Number(entry.vacation_amount || 0))}
                                        </strong>
                                      </div>
                                      {soldDays > 0 && (
                                        <div className="flex justify-between text-emerald-800">
                                          <span>
                                            Abono Pecuniário Isento ({soldDays}d · Art. 143 CLT):
                                          </span>
                                          <strong className="font-mono">
                                            {formatBRL(Number(entry.vacation_abono_amount || 0))}
                                          </strong>
                                        </div>
                                      )}
                                      {Number(entry.vacation_double_amount || 0) > 0 && (
                                        <div className="flex justify-between text-rose-700">
                                          <span>Dobra Art. 137 CLT (Prazo Concessivo):</span>
                                          <strong className="font-mono">
                                            {formatBRL(Number(entry.vacation_double_amount))}
                                          </strong>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {(Number(entry.overtime_amount || 0) > 0 ||
                                    Number(entry.dsr_amount || 0) > 0) && (
                                    <div className="flex justify-between">
                                      <span>Horas Extras + Reflexo DSR (Lei 605/49):</span>
                                      <strong className="font-mono">
                                        {formatBRL(
                                          Number(entry.overtime_amount || 0) +
                                            Number(entry.dsr_amount || 0)
                                        )}
                                      </strong>
                                    </div>
                                  )}
                                  {(Number(entry.night_shift_amount || 0) > 0 ||
                                    Number(entry.insalubrity_amount || 0) > 0 ||
                                    Number(entry.hazard_amount || 0) > 0) && (
                                    <div className="flex justify-between">
                                      <span>Adicionais (Noturno / Insalub. / Pericul.):</span>
                                      <strong className="font-mono">
                                        {formatBRL(
                                          Number(entry.night_shift_amount || 0) +
                                            Number(entry.insalubrity_amount || 0) +
                                            Number(entry.hazard_amount || 0)
                                        )}
                                      </strong>
                                    </div>
                                  )}
                                  {Number(entry.thirteenth_amount || 0) > 0 && (
                                    <div className="flex justify-between text-emerald-800">
                                      <span>13º Salário (Lei 4.090/62):</span>
                                      <strong className="font-mono">
                                        {formatBRL(Number(entry.thirteenth_amount))}
                                      </strong>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Coluna 3: Conformidade Tributária & Encargos Patronais */}
                              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-[#082175] flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    Tributos & Encargos Patronais
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {isPj ? 'Regime NFS-e' : 'CLT · Portaria Vigente'}
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px] text-slate-600">
                                  {!isPj ? (
                                    <>
                                      <div className="flex justify-between">
                                        <span>INSS Progressivo (EC 103/2019):</span>
                                        <strong className="font-mono text-rose-700">
                                          -{formatBRL(Number(entry.inss_amount || 0))}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>
                                          IRRF Retido{' '}
                                          {payrollParameters.apply_lei_15270
                                            ? '(Lei 15.270/2025)'
                                            : '(Tabela Padrão)'}
                                          :
                                        </span>
                                        <strong className="font-mono text-rose-700">
                                          -{formatBRL(Number(entry.irrf_amount || 0))}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between pt-1 border-t border-slate-100">
                                        <span>FGTS 8% (Lei 8.036/1990):</span>
                                        <strong className="font-mono text-[#082175]">
                                          {formatBRL(Number(entry.fgts_amount || 0))}
                                        </strong>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>INSS Patronal + Provisões (13º/Férias):</span>
                                        <strong className="font-mono text-[#082175]">
                                          {formatBRL(
                                            Number(entry.inss_patronal_amount || 0) +
                                              Number(entry.provision_13th || 0) +
                                              Number(entry.provision_vacation || 0)
                                          )}
                                        </strong>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex justify-between">
                                        <span>Status NFS-e:</span>
                                        <strong>{nfseBadge.label}</strong>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>ISS / IRRF / PCC Retidos:</span>
                                        <strong className="font-mono text-rose-700">
                                          -{formatBRL(Number(entry.total_discounts || 0))}
                                        </strong>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
