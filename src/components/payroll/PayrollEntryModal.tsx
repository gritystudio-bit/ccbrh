import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Gift,
  Info,
  Loader2,
  Palmtree,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  Employee,
  EmployeeContractType,
  Job,
  NfseStatus,
  PayrollEntry,
  PayrollLeaveType,
  PayrollParameters,
  PayrollStatus,
  ThirteenthSalaryMode,
} from '../../types/database';
import {
  analyzeEmployeeVacationCycles,
  calculatePayrollByContractType,
  calculateWorkedDaysForCompetence,
  formatIsoDateBR,
  type VacationCyclePeriod,
} from '../../utils/payrollCalculator';
import { supabase } from '../../lib/supabase';
import { useCcb, type PayrollUpsertInput } from '../../context/CcbContext';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDateBR = (iso?: string | null) => {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const LEAVE_TYPE_OPTIONS: Array<{
  value: PayrollLeaveType;
  label: string;
  helper: string;
  defaultDays?: number;
}> = [
  {
    value: 'none',
    label: 'Sem licença / afastamento na competência',
    helper: 'Jornada regular sem afastamentos médicos ou licenças legais.',
  },
  {
    value: 'medical',
    label: 'Afastamento Médico / Auxílio-Doença (Art. 476 CLT)',
    helper: 'Empresa remunera até os primeiros 15 dias; a partir do 16º dia fica a cargo do INSS.',
  },
  {
    value: 'work_accident',
    label: 'Acidente de Trabalho (Art. 15 §5º Lei 8.036/90)',
    helper: 'Empresa paga até 15 dias e mantém recolhimento de FGTS (8%) sobre todo o período.',
  },
  {
    value: 'maternity',
    label: 'Licença-Maternidade (Art. 392 CLT - 120 dias)',
    helper: 'Salário pago integralmente no holerite e compensado no INSS Patronal da empresa.',
    defaultDays: 30,
  },
  {
    value: 'paternity',
    label: 'Licença-Paternidade Remunerada (Art. 473 III CLT)',
    helper: 'Ausência legal remunerada (padrão 5 dias consecutivos) sem desconto salarial.',
    defaultDays: 5,
  },
  {
    value: 'marriage',
    label: 'Licença Casamento / Gala (Art. 473 II CLT)',
    helper: 'Até 3 dias consecutivos abonados por motivo de casamento.',
    defaultDays: 3,
  },
  {
    value: 'bereavement',
    label: 'Licença Nojo / Falecimento (Art. 473 I CLT)',
    helper: 'Até 2 dias consecutivos abonados por falecimento de familiar direto.',
    defaultDays: 2,
  },
  {
    value: 'unpaid',
    label: 'Licença Não Remunerada (Art. 476-A / Acordo)',
    helper: 'Suspensão temporária sem pagamento salarial nos dias de afastamento.',
  },
];

interface PayrollEntryModalProps {
  employeeId: string | null;
  competence: string;
  employees: Employee[];
  jobs: Job[];
  existingEntries: PayrollEntry[];
  companyParameters: PayrollParameters;
  onClose: () => void;
  onSave: (input: PayrollUpsertInput) => Promise<void>;
}

export const PayrollEntryModal: React.FC<PayrollEntryModalProps> = ({
  employeeId,
  competence,
  employees,
  jobs,
  existingEntries,
  companyParameters,
  onClose,
  onSave,
}) => {
  const { refreshDatabase } = useCcb();
  const initialEmp = employees.find((e) => e.id === employeeId);
  const initialExisting = existingEntries.find(
    (p) => p.employee_id === employeeId && p.competence === competence
  );
  const initialJob = jobs.find((j) => j.id === initialEmp?.job_id);
  const initialContract: EmployeeContractType =
    initialExisting?.contract_type || initialEmp?.contract_type || 'clt';
  const initialCompInfo = calculateWorkedDaysForCompetence(
    competence,
    initialEmp?.hire_date,
    initialEmp?.resignation_date
  );

  const [cltSubTab, setCltSubTab] = useState<'routine' | 'events'>('routine');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const [contractType, setContractType] = useState<EmployeeContractType>(initialContract);
  const [baseSalary, setBaseSalary] = useState(
    initialExisting
      ? Number(initialExisting.base_salary)
      : initialContract === 'pj'
      ? Number(
          initialEmp?.pj_monthly_value ?? initialEmp?.salary_override ?? initialJob?.base_salary ?? 0
        )
      : Number(initialEmp?.salary_override ?? initialJob?.base_salary ?? 0)
  );
  const [workedDays, setWorkedDays] = useState(
    initialExisting ? Number(initialExisting.worked_days) : initialCompInfo.workedDays
  );
  const [dependentsCount, setDependentsCount] = useState(
    initialExisting ? Number(initialExisting.dependents_count) : initialEmp?.dependents_count ?? 0
  );
  const [ot50, setOt50] = useState(initialExisting ? Number(initialExisting.overtime_50_hours) : 0);
  const [ot100, setOt100] = useState(
    initialExisting ? Number(initialExisting.overtime_100_hours) : 0
  );
  const [nightHours, setNightHours] = useState(
    initialExisting ? Number(initialExisting.night_hours) : 0
  );
  const [insalubrity, setInsalubrity] = useState(
    initialExisting ? Number(initialExisting.insalubrity_rate) : 0
  );
  const [hazardPay, setHazardPay] = useState(
    initialExisting ? Boolean(initialExisting.hazard_pay) : false
  );
  const [bonuses, setBonuses] = useState(initialExisting ? Number(initialExisting.bonuses) : 0);
  const [absences, setAbsences] = useState(
    initialExisting ? Number(initialExisting.absence_days) : 0
  );
  const [vtOptedIn, setVtOptedIn] = useState(
    initialExisting
      ? Boolean(initialExisting.vt_opted_in)
      : initialEmp?.vt_opted_in ?? companyParameters.default_vt_opted_in
  );
  const [vrDiscount, setVrDiscount] = useState(
    initialExisting
      ? Number(initialExisting.vr_discount)
      : Number(initialEmp?.vr_discount ?? companyParameters.default_vr_discount ?? 0)
  );
  const [otherDiscounts, setOtherDiscounts] = useState(
    initialExisting
      ? Number(initialExisting.other_discounts)
      : Number(initialEmp?.health_plan_discount ?? 0)
  );

  // Estados de Férias (Incluindo Período Aquisitivo/Concessivo e Dobra Art. 137 CLT)
  const [vacationDays, setVacationDays] = useState(
    initialExisting ? Number(initialExisting.vacation_days || 0) : 0
  );
  const [vacationSoldDays, setVacationSoldDays] = useState(
    initialExisting ? Number(initialExisting.vacation_sold_days || 0) : 0
  );
  const [vacationDoubledDays, setVacationDoubledDays] = useState(
    initialExisting ? Number(initialExisting.vacation_doubled_days || 0) : 0
  );
  const [vacationPeriodLabel, setVacationPeriodLabel] = useState(
    initialExisting?.vacation_period_label || ''
  );
  const [updatingCycleCutoff, setUpdatingCycleCutoff] = useState(false);

  // Estados de Licenças & 13º Salário
  const [leaveType, setLeaveType] = useState<PayrollLeaveType>(
    initialExisting?.leave_type || 'none'
  );
  const [leaveDays, setLeaveDays] = useState(
    initialExisting ? Number(initialExisting.leave_days || 0) : 0
  );
  const [thirteenthMode, setThirteenthMode] = useState<ThirteenthSalaryMode>(
    initialExisting?.thirteenth_mode || 'none'
  );

  const [nfseNumber, setNfseNumber] = useState(initialExisting?.nfse_number || '');
  const [nfseStatus, setNfseStatus] = useState<NfseStatus>(
    initialExisting?.nfse_status ||
      (companyParameters.pj_require_nfse ? 'awaiting_issue' : 'not_applicable')
  );
  const [nfseIssuedAt, setNfseIssuedAt] = useState(initialExisting?.nfse_issued_at || '');
  const [status, setStatus] = useState<PayrollStatus>(initialExisting?.status || 'draft');
  const [notes, setNotes] = useState(initialExisting?.notes || initialCompInfo.reason || '');
  const [saving, setSaving] = useState(false);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedEligibility = calculateWorkedDaysForCompetence(
    competence,
    selectedEmployee?.hire_date,
    selectedEmployee?.resignation_date
  );

  const preview = useMemo(
    () =>
      calculatePayrollByContractType(contractType, {
        baseSalary,
        workedDays,
        dependentsCount,
        overtime50Hours: ot50,
        overtime100Hours: ot100,
        nightHours,
        insalubrityRate: insalubrity,
        hazardPay,
        bonuses,
        absenceDays: absences,
        vtOptedIn,
        vrDiscount,
        otherDiscounts,
        vacationDays,
        vacationSoldDays,
        vacationDoubledDays,
        vacationThirdRate: companyParameters.vacation_constitutional_third_rate,
        leaveType,
        leaveDays,
        medicalLeaveCompanyPaidDays: companyParameters.medical_leave_company_paid_days,
        accidentLeaveKeepFgts: companyParameters.accident_leave_keep_fgts,
        maternityOffsetInssPatronal: companyParameters.maternity_offset_inss_patronal,
        thirteenthMode,
        minimumWage: companyParameters.minimum_wage,
        patronalInssRate: companyParameters.patronal_inss_rate,
        fgtsRate: companyParameters.fgts_rate,
        vtCapRate: companyParameters.vt_discount_cap_rate,
        applyLei15270: companyParameters.apply_lei_15270,
        pjIssRate: companyParameters.pj_default_iss_rate,
        pjIrrfRate: companyParameters.pj_default_irrf_rate,
        pjPccRate: companyParameters.pj_default_pcc_rate,
        pjAutoProportionalDates: companyParameters.pj_auto_proportional_dates,
      }),
    [
      contractType,
      baseSalary,
      workedDays,
      dependentsCount,
      ot50,
      ot100,
      nightHours,
      insalubrity,
      hazardPay,
      bonuses,
      absences,
      vtOptedIn,
      vrDiscount,
      otherDiscounts,
      vacationDays,
      vacationSoldDays,
      vacationDoubledDays,
      leaveType,
      leaveDays,
      thirteenthMode,
      companyParameters,
    ]
  );

  const vacationSummary = useMemo(
    () =>
      analyzeEmployeeVacationCycles({
        employee: selectedEmployee,
        competence,
        entitledDaysPerCycle: preview.entitledVacationDaysByAbsences,
        existingEntries,
        excludeCompetence: competence,
      }),
    [selectedEmployee, competence, preview.entitledVacationDaysByAbsences, existingEntries]
  );

  const handleChangeEmployee = (newEmpId: string) => {
    setSelectedEmployeeId(newEmpId);
    const emp = employees.find((e) => e.id === newEmpId);
    const job = jobs.find((j) => j.id === emp?.job_id);
    const nextContract: EmployeeContractType = emp?.contract_type || 'clt';
    const elig = calculateWorkedDaysForCompetence(
      competence,
      emp?.hire_date,
      emp?.resignation_date
    );
    setContractType(nextContract);
    setBaseSalary(
      nextContract === 'pj'
        ? Number(emp?.pj_monthly_value ?? emp?.salary_override ?? job?.base_salary ?? 0)
        : Number(emp?.salary_override ?? job?.base_salary ?? 0)
    );
    setWorkedDays(elig.workedDays);
    setDependentsCount(nextContract === 'pj' ? 0 : emp?.dependents_count ?? 0);
    setVtOptedIn(
      nextContract === 'pj'
        ? false
        : emp?.vt_opted_in ?? companyParameters.default_vt_opted_in
    );
    setVrDiscount(
      nextContract === 'pj'
        ? 0
        : Number(emp?.vr_discount ?? companyParameters.default_vr_discount ?? 0)
    );
    setOtherDiscounts(nextContract === 'pj' ? 0 : Number(emp?.health_plan_discount ?? 0));
    setVacationDays(0);
    setVacationSoldDays(0);
    setVacationDoubledDays(0);
    setVacationPeriodLabel('');
    setLeaveType('none');
    setLeaveDays(0);
    setThirteenthMode('none');
    setNfseStatus(
      nextContract === 'pj'
        ? companyParameters.pj_require_nfse
          ? 'awaiting_issue'
          : 'not_applicable'
        : 'not_applicable'
    );
    setNotes(elig.reason || '');
  };

  const handleVacationDaysChange = (nextVacationDays: number) => {
    const clamped = Math.min(30, Math.max(0, nextVacationDays));
    setVacationDays(clamped);
    const remainingWorked = Math.max(0, 30 - clamped - (leaveType !== 'none' ? leaveDays : 0));
    setWorkedDays(remainingWorked);
    if (clamped === 0) {
      setVacationDoubledDays(0);
      setVacationPeriodLabel('');
    }
  };

  const handleSelectVacationCycle = (cycle: VacationCyclePeriod) => {
    const daysToLaunch = Math.min(30, cycle.remainingDays || 30);
    const isExpired = cycle.status === 'expired_double';
    const labelText = isExpired
      ? `${cycle.label} (Vencida · Dobra Art. 137 CLT)`
      : `${cycle.label} (No Prazo Concessivo · Art. 134 CLT)`;

    setVacationPeriodLabel(labelText);
    setVacationDays(daysToLaunch);
    setVacationDoubledDays(
      isExpired && (companyParameters.vacation_expired_double_pay ?? true) ? daysToLaunch : 0
    );
    const remainingWorked = Math.max(
      0,
      30 - daysToLaunch - (leaveType !== 'none' ? leaveDays : 0)
    );
    setWorkedDays(remainingWorked);
  };

  const handleUpdateSettledUntil = async (newSettledEndIso: string | null) => {
    if (!selectedEmployee) return;
    setUpdatingCycleCutoff(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ last_vacation_settled_until: newSettledEndIso })
        .eq('id', selectedEmployee.id);
      if (!error) {
        await refreshDatabase();
      }
    } finally {
      setUpdatingCycleCutoff(false);
    }
  };

  const handleLeaveTypeChange = (nextType: PayrollLeaveType) => {
    setLeaveType(nextType);
    if (nextType === 'none') {
      setLeaveDays(0);
      setWorkedDays(Math.max(0, 30 - vacationDays));
      return;
    }
    const preset = LEAVE_TYPE_OPTIONS.find((o) => o.value === nextType)?.defaultDays ?? 5;
    setLeaveDays(preset);
    setWorkedDays(Math.max(0, 30 - vacationDays - preset));
  };

  const handleLeaveDaysChange = (nextLeaveDays: number) => {
    const clamped = Math.min(30, Math.max(0, nextLeaveDays));
    setLeaveDays(clamped);
    setWorkedDays(Math.max(0, 30 - vacationDays - clamped));
  };

  if (employeeId === null) return null;

  const isPj = contractType === 'pj';
  const activeEventsCount =
    (vacationDays > 0 || vacationSoldDays > 0 || vacationDoubledDays > 0 ? 1 : 0) +
    (leaveType !== 'none' && leaveDays > 0 ? 1 : 0) +
    (thirteenthMode !== 'none' ? 1 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    setSaving(true);
    try {
      await onSave({
        employeeId: selectedEmployeeId,
        competence,
        contractType,
        baseSalary,
        workedDays,
        dependentsCount,
        overtime50Hours: ot50,
        overtime100Hours: ot100,
        nightHours,
        insalubrityRate: insalubrity,
        hazardPay,
        bonuses,
        absenceDays: absences,
        vtOptedIn,
        vrDiscount,
        otherDiscounts,
        vacationDays: isPj ? 0 : vacationDays,
        vacationSoldDays: isPj ? 0 : vacationSoldDays,
        vacationDoubledDays: isPj ? 0 : vacationDoubledDays,
        vacationPeriodLabel: isPj ? null : vacationPeriodLabel || null,
        leaveType: isPj ? 'none' : leaveType,
        leaveDays: isPj ? 0 : leaveDays,
        thirteenthMode: isPj ? 'none' : thirteenthMode,
        nfseNumber: isPj ? nfseNumber : null,
        nfseStatus: isPj ? nfseStatus : 'not_applicable',
        nfseIssuedAt: isPj && nfseIssuedAt ? nfseIssuedAt : null,
        status,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
              {isPj
                ? 'Controle de Contrato PJ & NFS-e'
                : 'Cálculo Trabalhista CLT · Férias, Licenças & Lei 15.270/2025'}
            </p>
            <h3 className="text-lg font-bold text-[#082175]">
              Lançamento da Competência {competence}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Colaborador / Prestador:
              </label>
              <select
                required
                value={selectedEmployeeId}
                onChange={(e) => handleChangeEmployee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
              >
                <option value="">Selecione...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} · [{(emp.contract_type || 'clt').toUpperCase()}] (Admissão:{' '}
                    {formatDateBR(emp.hire_date)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Contratação:
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg font-bold">
                <button
                  type="button"
                  onClick={() => setContractType('clt')}
                  className={`py-1.5 rounded cursor-pointer ${
                    contractType === 'clt' ? 'bg-[#082175] text-white' : 'text-slate-600'
                  }`}
                >
                  CLT (PF)
                </button>
                <button
                  type="button"
                  onClick={() => setContractType('pj')}
                  className={`py-1.5 rounded cursor-pointer ${
                    contractType === 'pj' ? 'bg-purple-700 text-white' : 'text-slate-600'
                  }`}
                >
                  PJ (NFS-e)
                </button>
              </div>
            </div>
          </div>

          {selectedEmployee && (
            <div
              className={`rounded-lg px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2 border ${
                !isPj && vacationSummary.expiredCycles.length > 0
                  ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                  : selectedEligibility.eligible
                  ? 'bg-[#E0F4F7]/60 border-[#c8e8ed] text-[#03416A]'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {!isPj && vacationSummary.expiredCycles.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Info className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  Início em <strong>{formatDateBR(selectedEmployee.hire_date)}</strong> ·{' '}
                  {workedDays}d trabalhados na competência
                </span>
              </div>
              {!isPj && (
                <div className="flex items-center gap-2 flex-wrap">
                  {vacationSummary.totalOpenPeriodsCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setCltSubTab('events')}
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer ${
                        vacationSummary.expiredCycles.length > 0
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {vacationSummary.totalOpenPeriodsCount} Férias a tirar (
                      {vacationSummary.totalOpenDays}d)
                      {vacationSummary.expiredCycles.length > 0
                        ? ` · ${vacationSummary.expiredCycles.length} Vencida(s) Art. 137`
                        : ''}
                    </button>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      Férias vencidas/adquiridas em dia
                    </span>
                  )}
                  <span className="font-semibold text-[#082175]">
                    Direito p/ Ciclo (Art. 130): {preview.entitledVacationDaysByAbsences}d
                  </span>
                </div>
              )}
            </div>
          )}

          {isPj ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
                <p className="font-bold text-purple-900">Valores do Contrato PJ</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 mb-1">Valor Mensal Contrato (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Dias na Competência</label>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={workedDays}
                      onChange={(e) => setWorkedDays(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Reembolsos / Bônus PJ (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={bonuses}
                      onChange={(e) => setBonuses(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Glosas / Descontos (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={otherDiscounts}
                      onChange={(e) => setOtherDiscounts(Number(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="font-bold text-[#082175]">Controle de NFS-e & Status</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 mb-1">Status NFS-e</label>
                    <select
                      value={nfseStatus}
                      onChange={(e) => setNfseStatus(e.target.value as NfseStatus)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="awaiting_issue">Aguardando Emissão</option>
                      <option value="issued">NFS-e Emitida</option>
                      <option value="approved">Conferida / Aprovada</option>
                      <option value="not_applicable">Dispensada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Número da NFS-e</label>
                    <input
                      type="text"
                      value={nfseNumber}
                      onChange={(e) => setNfseNumber(e.target.value)}
                      placeholder="Ex: 2026-0048"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Data Emissão NFS-e</label>
                    <input
                      type="date"
                      value={nfseIssuedAt}
                      onChange={(e) => setNfseIssuedAt(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Situação Pagamento</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PayrollStatus)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="closed">Fechada</option>
                      <option value="paid">Paga</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sub-Abas Confortáveis para CLT */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl font-bold">
                <button
                  type="button"
                  onClick={() => setCltSubTab('routine')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                    cltSubTab === 'routine'
                      ? 'bg-white text-[#082175] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#082175]" />
                  <span>1. Jornada, Adicionais & Descontos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCltSubTab('events')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all cursor-pointer ${
                    cltSubTab === 'events'
                      ? 'bg-white text-[#082175] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Palmtree className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Férias, Licenças & 13º Salário</span>
                  {(activeEventsCount > 0 || vacationSummary.totalOpenPeriodsCount > 0) && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] text-white ${
                        vacationSummary.expiredCycles.length > 0
                          ? 'bg-rose-600'
                          : 'bg-amber-500'
                      }`}
                    >
                      {activeEventsCount > 0
                        ? `${activeEventsCount} ativo(s)`
                        : `${vacationSummary.totalOpenPeriodsCount} férias`}
                    </span>
                  )}
                </button>
              </div>

              {cltSubTab === 'routine' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#082175]">Proventos & Adicionais CLT</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-600 mb-1">Salário Base (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={baseSalary}
                          onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Dias Trabalhados</label>
                        <input
                          type="number"
                          min={0}
                          max={31}
                          value={workedDays}
                          onChange={(e) => setWorkedDays(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Horas Extras 50% (h)</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={ot50}
                          onChange={(e) => setOt50(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Horas Extras 100% (h)</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={ot100}
                          onChange={(e) => setOt100(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Adicional Noturno (h)</label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={nightHours}
                          onChange={(e) => setNightHours(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Insalubridade</label>
                        <select
                          value={insalubrity}
                          onChange={(e) => setInsalubrity(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        >
                          <option value={0}>Não aplicável (0%)</option>
                          <option value={10}>Grau Mínimo (10%)</option>
                          <option value={20}>Grau Médio (20%)</option>
                          <option value={40}>Grau Máximo (40%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Bonificações (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={bonuses}
                          onChange={(e) => setBonuses(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hazardPay}
                            onChange={(e) => setHazardPay(e.target.checked)}
                          />
                          <span className="font-semibold text-slate-700">Periculosidade 30%</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#082175]">Descontos & Dependentes CLT</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-600 mb-1">Dependentes IRRF</label>
                        <input
                          type="number"
                          min={0}
                          value={dependentsCount}
                          onChange={(e) => setDependentsCount(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">
                          Faltas Injustificadas (dias)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={31}
                          value={absences}
                          onChange={(e) => setAbsences(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Desconto VR/VA (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={vrDiscount}
                          onChange={(e) => setVrDiscount(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Outros / Saúde (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={otherDiscounts}
                          onChange={(e) => setOtherDiscounts(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Situação</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as PayrollStatus)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        >
                          <option value="draft">Rascunho</option>
                          <option value="closed">Fechada</option>
                          <option value="paid">Paga</option>
                        </select>
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={vtOptedIn}
                            onChange={(e) => setVtOptedIn(e.target.checked)}
                          />
                          <span className="font-semibold text-slate-700">Optante VT (6%)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Card 1: Férias + Controle de Períodos Aquisitivos e Concessivos (Arts. 130, 134 e 137 CLT) */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Palmtree className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-slate-900">
                          Férias na Competência + Controle de Períodos (Arts. 129 a 145 CLT)
                        </span>
                      </div>
                      {(preview.vacationAmount > 0 ||
                        preview.vacationAbonoAmount > 0 ||
                        preview.vacationDoubleAmount > 0) && (
                        <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          Total Férias: +
                          {formatBRL(
                            preview.vacationAmount +
                              preview.vacationAbonoAmount +
                              preview.vacationDoubleAmount
                          )}
                        </span>
                      )}
                    </div>

                    {/* Painel de Períodos Aquisitivos & Concessivos do Colaborador */}
                    {vacationSummary.cycles.length > 0 && (
                      <div className="bg-white border border-amber-200/80 rounded-xl p-3 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CalendarClock className="w-3.5 h-3.5 text-[#082175]" />
                            <span className="font-bold text-slate-800 text-[11px]">
                              Histórico de Períodos Aquisitivos ({vacationSummary.totalOpenPeriodsCount}{' '}
                              período(s) a gozar)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-500">Último período quitado:</span>
                            <select
                              disabled={updatingCycleCutoff}
                              value={selectedEmployee?.last_vacation_settled_until?.slice(0, 10) || ''}
                              onChange={(e) =>
                                void handleUpdateSettledUntil(e.target.value || null)
                              }
                              className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 font-semibold text-slate-700"
                            >
                              <option value="">Padrão automático (24m)</option>
                              <option value="1900-01-01">Nenhum quitado (todos em aberto)</option>
                              {vacationSummary.cycles
                                .filter((c) => c.status !== 'acquiring')
                                .map((c) => (
                                  <option key={c.label} value={c.acquisitiveEnd}>
                                    Quitado até {c.label} (fim {formatIsoDateBR(c.acquisitiveEnd)})
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {vacationSummary.cycles.slice(-3).map((cycle) => {
                            const isExpired = cycle.status === 'expired_double';
                            const isConcessive = cycle.status === 'open_concessive';
                            const isAcquiring = cycle.status === 'acquiring';
                            const isSelected = vacationPeriodLabel.startsWith(cycle.label);

                            return (
                              <div
                                key={cycle.label}
                                className={`rounded-lg border p-2.5 flex flex-col justify-between gap-1.5 transition-all ${
                                  isSelected
                                    ? 'border-[#082175] bg-blue-50/50 ring-1 ring-[#082175]'
                                    : isExpired
                                    ? 'border-rose-200 bg-rose-50/50'
                                    : isConcessive
                                    ? 'border-amber-200 bg-amber-50/40'
                                    : 'border-slate-200 bg-slate-50/70'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-slate-900">
                                      Ciclo {cycle.label}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        isExpired
                                          ? 'bg-rose-600 text-white'
                                          : isConcessive
                                          ? 'bg-amber-500 text-white'
                                          : isAcquiring
                                          ? 'bg-blue-100 text-[#082175]'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {isExpired
                                        ? 'Vencida · Dobra Art. 137'
                                        : isConcessive
                                        ? 'No Prazo · Art. 134'
                                        : isAcquiring
                                        ? `Proporcional (${cycle.proportionalMonths}/12)`
                                        : 'Quitada'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-0.5">
                                    Aquisitivo: {formatIsoDateBR(cycle.acquisitiveStart)} a{' '}
                                    {formatIsoDateBR(cycle.acquisitiveEnd)}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-medium">
                                    {isExpired
                                      ? `Concessivo expirou em ${formatIsoDateBR(cycle.concessiveLimit)}`
                                      : `Limite Concessivo: ${formatIsoDateBR(cycle.concessiveLimit)}`}
                                  </p>
                                </div>

                                {(isExpired || isConcessive) && (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectVacationCycle(cycle)}
                                    className={`w-full py-1 px-2 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#082175] text-white'
                                        : isExpired
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                                    }`}
                                  >
                                    {isSelected
                                      ? 'Período Selecionado no Cálculo'
                                      : isExpired
                                      ? `Lançar ${cycle.remainingDays}d (c/ Dobra Art. 137)`
                                      : `Lançar ${cycle.remainingDays}d (Normal)`}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Dias Férias Gozadas
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={vacationDays}
                          onChange={(e) => handleVacationDaysChange(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                        <span className="text-[10px] text-slate-500">
                          +1/3: {formatBRL(preview.vacationAmount)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-rose-800 font-semibold mb-1">
                          Dias em Dobro (Art. 137)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={vacationDoubledDays}
                          onChange={(e) =>
                            setVacationDoubledDays(
                              Math.min(30, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-rose-900 font-semibold"
                        />
                        <span className="text-[10px] text-rose-700 font-medium">
                          Dobra + 1/3: {formatBRL(preview.vacationDoubleAmount)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Abono (Venda até 10d)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={companyParameters.vacation_abono_max_days ?? 10}
                          value={vacationSoldDays}
                          onChange={(e) =>
                            setVacationSoldDays(
                              Math.min(10, Math.max(0, Number(e.target.value) || 0))
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
                        />
                        <span className="text-[10px] text-emerald-700 font-medium">
                          Isento: {formatBRL(preview.vacationAbonoAmount)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Atalhos (Lei 13.467)
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {[0, 14, 15, 20, 30].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleVacationDaysChange(d)}
                              className={`px-2 py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                                vacationDays === d
                                  ? 'bg-[#082175] text-white border-[#082175]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {d === 0 ? 'Zerar' : `${d}d`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Licenças & Afastamentos */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-[#082175]" />
                        <span className="font-bold text-slate-900">
                          Licenças Remuneradas & Afastamentos (Arts. 392, 473 e 476 CLT)
                        </span>
                      </div>
                      {preview.leavePaidAmount > 0 && (
                        <span className="font-mono font-bold text-[#082175] bg-blue-100 px-2.5 py-0.5 rounded-full">
                          Pago Empresa: {formatBRL(preview.leavePaidAmount)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-semibold mb-1">
                          Modalidade da Licença ou Afastamento
                        </label>
                        <select
                          value={leaveType}
                          onChange={(e) =>
                            handleLeaveTypeChange(e.target.value as PayrollLeaveType)
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
                        >
                          {LEAVE_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {LEAVE_TYPE_OPTIONS.find((o) => o.value === leaveType)?.helper}
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Dias de Afastamento no Mês
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={31}
                          disabled={leaveType === 'none'}
                          value={leaveDays}
                          onChange={(e) => handleLeaveDaysChange(Number(e.target.value) || 0)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 disabled:bg-slate-100"
                        />
                        {leaveType === 'maternity' && preview.maternityInssOffsetAmount > 0 && (
                          <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                            Compensa INSS: -{formatBRL(preview.maternityInssOffsetAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: 13º Salário */}
                  <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-slate-900">
                          13º Salário (Gratificação Natalina · Isenção IRRF Lei 15.270/2025 Art. 3º)
                        </span>
                      </div>
                      {preview.thirteenthAmount > 0 && (
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          +{formatBRL(preview.thirteenthAmount)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'none', label: 'Não incluir 13º' },
                          { id: 'first_installment', label: '1ª Parcela (50%)' },
                          { id: 'second_installment', label: '2ª Parcela (Final)' },
                          { id: 'full_single', label: 'Parcela Única (100%)' },
                        ] as Array<{ id: ThirteenthSalaryMode; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setThirteenthMode(opt.id)}
                          className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            thirteenthMode === opt.id
                              ? 'bg-[#082175] text-white border-[#082175]'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-slate-600 mb-1">Observações:</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações internas sobre férias, atestados ou ajustes desta competência..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
            />
          </div>

          <div className="bg-[#082175] text-white rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#E0F4F7] block">
                {isPj ? 'Valor a Emitir NFS-e' : 'Total Bruto'}
              </span>
              <span className="text-base font-bold font-mono">{formatBRL(preview.grossSalary)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-red-200 block">
                {isPj ? 'ISS + Retenções PJ' : 'INSS + IRRF Final'}
              </span>
              <span className="text-base font-bold font-mono">
                -
                {formatBRL(
                  isPj
                    ? preview.pjIssAmount + preview.pjRetentionAmount
                    : preview.inssAmount + preview.irrfAmount
                )}
              </span>
              {!isPj && preview.lei15270Reduction > 0 && (
                <span className="text-[10px] text-emerald-300 block">
                  Redução L15.270: -{formatBRL(preview.lei15270Reduction)}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 block">
                {isPj ? 'Líquido a Transferir' : 'Salário Líquido'}
              </span>
              <span className="text-base font-bold font-mono text-emerald-300">
                {formatBRL(preview.netSalary)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#f5a90e] block">
                {isPj ? 'Custo Empresa (sem CLT)' : 'Custo Total Empresa'}
              </span>
              <span className="text-base font-bold font-mono text-[#f5a90e]">
                {formatBRL(preview.totalEmployerCost)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !selectedEmployeeId}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Salvar Cálculo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
