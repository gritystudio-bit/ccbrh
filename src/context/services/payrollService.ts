import type {
  Employee,
  EmployeeContractType,
  Job,
  NfseStatus,
  PayrollEntry,
  PayrollLeaveType,
  PayrollParameters,
  PayrollStatus,
  PayslipSentStatus,
  ThirteenthSalaryMode,
} from '../../types/database';
import { supabase } from '../../lib/supabase';
import {
  buildDefaultCompanyPayrollParameters,
  calculatePayrollByContractType,
  calculateWorkedDaysForCompetence,
} from '../../utils/payrollCalculator';

export interface PayrollUpsertInput {
  employeeId: string;
  competence: string;
  contractType?: EmployeeContractType;
  baseSalary: number;
  workedDays: number;
  dependentsCount: number;
  overtime50Hours: number;
  overtime100Hours: number;
  nightHours: number;
  insalubrityRate: number;
  hazardPay: boolean;
  bonuses: number;
  absenceDays: number;
  vtOptedIn: boolean;
  vrDiscount: number;
  otherDiscounts: number;
  vacationDays?: number;
  vacationSoldDays?: number;
  vacationDoubledDays?: number;
  vacationPeriodLabel?: string | null;
  leaveType?: PayrollLeaveType;
  leaveDays?: number;
  thirteenthMode?: ThirteenthSalaryMode;
  nfseNumber?: string | null;
  nfseStatus?: NfseStatus;
  nfseIssuedAt?: string | null;
  status?: PayrollStatus;
  notes?: string;
}

export function resolveEmployeePayrollBaseSalary(emp: Employee, jobs: Job[]): number {
  const job = jobs.find((j) => j.id === emp.job_id);
  return emp.contract_type === 'pj'
    ? Number(emp.pj_monthly_value ?? emp.salary_override ?? job?.base_salary ?? 0)
    : Number(emp.salary_override ?? job?.base_salary ?? 0);
}

async function recalculateDraftEntryForEmployee(
  tenantId: string,
  entry: PayrollEntry,
  emp: Employee,
  jobs: Job[],
  companyParams: PayrollParameters
): Promise<PayrollEntry> {
  const contractType: EmployeeContractType = emp.contract_type || 'clt';
  const isPj = contractType === 'pj';
  const baseSalary = resolveEmployeePayrollBaseSalary(emp, jobs);
  const eligibility = calculateWorkedDaysForCompetence(
    entry.competence,
    emp.hire_date,
    emp.resignation_date
  );
  const workedDays = eligibility.eligible ? eligibility.workedDays : 0;

  return upsertPayrollEntryService(
    tenantId,
    {
      employeeId: emp.id,
      competence: entry.competence,
      contractType,
      baseSalary,
      workedDays,
      dependentsCount: isPj ? 0 : emp.dependents_count ?? entry.dependents_count ?? 0,
      overtime50Hours: isPj ? 0 : Number(entry.overtime_50_hours || 0),
      overtime100Hours: isPj ? 0 : Number(entry.overtime_100_hours || 0),
      nightHours: isPj ? 0 : Number(entry.night_hours || 0),
      insalubrityRate: isPj ? 0 : Number(entry.insalubrity_rate || 0),
      hazardPay: isPj ? false : Boolean(entry.hazard_pay),
      bonuses: Number(entry.bonuses || 0),
      absenceDays: isPj ? 0 : Number(entry.absence_days || 0),
      vtOptedIn: isPj ? false : emp.vt_opted_in ?? entry.vt_opted_in ?? companyParams.default_vt_opted_in,
      vrDiscount: isPj ? 0 : Number(emp.vr_discount ?? entry.vr_discount ?? 0),
      otherDiscounts: isPj ? 0 : Number(emp.health_plan_discount ?? entry.other_discounts ?? 0),
      vacationDays: isPj ? 0 : Number(entry.vacation_days || 0),
      vacationSoldDays: isPj ? 0 : Number(entry.vacation_sold_days || 0),
      vacationDoubledDays: isPj ? 0 : Number(entry.vacation_doubled_days || 0),
      vacationPeriodLabel: isPj ? null : entry.vacation_period_label || null,
      leaveType: isPj ? 'none' : entry.leave_type || 'none',
      leaveDays: isPj ? 0 : Number(entry.leave_days || 0),
      thirteenthMode: isPj ? 'none' : entry.thirteenth_mode || 'none',
      nfseNumber: isPj ? entry.nfse_number || null : null,
      nfseStatus: isPj
        ? entry.nfse_status && entry.nfse_status !== 'not_applicable'
          ? entry.nfse_status
          : companyParams.pj_require_nfse
            ? 'awaiting_issue'
            : 'not_applicable'
        : 'not_applicable',
      nfseIssuedAt: isPj ? entry.nfse_issued_at || null : null,
      status: 'draft',
      notes: eligibility.reason || entry.notes || undefined,
    },
    emp,
    companyParams
  );
}

export async function syncEmployeeDraftPayrollEntriesService(params: {
  tenantId: string;
  employee: Employee;
  jobs: Job[];
  payrollEntries: PayrollEntry[];
  companyParams: PayrollParameters;
}): Promise<number> {
  const { tenantId, employee, jobs, payrollEntries, companyParams } = params;
  const draftEntries = payrollEntries.filter(
    (p) => p.employee_id === employee.id && p.status === 'draft'
  );
  if (draftEntries.length === 0) return 0;

  let synced = 0;
  for (const entry of draftEntries) {
    await recalculateDraftEntryForEmployee(tenantId, entry, employee, jobs, companyParams);
    synced += 1;
  }
  return synced;
}

export async function syncDraftEntriesForCompetenceService(params: {
  tenantId: string;
  competence?: string;
  employees: Employee[];
  jobs: Job[];
  payrollEntries: PayrollEntry[];
  companyParams: PayrollParameters;
}): Promise<number> {
  const { tenantId, competence, employees, jobs, payrollEntries, companyParams } = params;
  const draftEntries = payrollEntries.filter(
    (p) => p.status === 'draft' && (!competence || p.competence === competence)
  );
  if (draftEntries.length === 0) return 0;

  let synced = 0;
  for (const entry of draftEntries) {
    const emp = employees.find((e) => e.id === entry.employee_id);
    if (!emp) continue;
    await recalculateDraftEntryForEmployee(tenantId, entry, emp, jobs, companyParams);
    synced += 1;
  }
  return synced;
}

export async function savePayrollParametersService(
  tenantId: string,
  params: Omit<PayrollParameters, 'id' | 'tenant_id' | 'updated_at'>
): Promise<PayrollParameters> {
  const payload = {
    tenant_id: tenantId,
    ...params,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('payroll_parameters')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao salvar parâmetros globais PF/PJ.');
  }
  return data as PayrollParameters;
}

export async function upsertPayrollEntryService(
  tenantId: string,
  input: PayrollUpsertInput,
  employee: Employee | undefined,
  companyParams: PayrollParameters
): Promise<PayrollEntry> {
  const contractType: EmployeeContractType =
    input.contractType || employee?.contract_type || 'clt';
  const isPj = contractType === 'pj';

  const calc = calculatePayrollByContractType(contractType, {
    baseSalary: input.baseSalary,
    workedDays: input.workedDays,
    dependentsCount: input.dependentsCount,
    overtime50Hours: input.overtime50Hours,
    overtime100Hours: input.overtime100Hours,
    nightHours: input.nightHours,
    insalubrityRate: input.insalubrityRate,
    hazardPay: input.hazardPay,
    bonuses: input.bonuses,
    absenceDays: input.absenceDays,
    vtOptedIn: input.vtOptedIn,
    vrDiscount: input.vrDiscount,
    otherDiscounts: input.otherDiscounts,
    vacationDays: isPj ? 0 : input.vacationDays ?? 0,
    vacationSoldDays: isPj ? 0 : input.vacationSoldDays ?? 0,
    vacationDoubledDays: isPj ? 0 : input.vacationDoubledDays ?? 0,
    vacationThirdRate: companyParams.vacation_constitutional_third_rate,
    leaveType: isPj ? 'none' : input.leaveType ?? 'none',
    leaveDays: isPj ? 0 : input.leaveDays ?? 0,
    medicalLeaveCompanyPaidDays: companyParams.medical_leave_company_paid_days,
    accidentLeaveKeepFgts: companyParams.accident_leave_keep_fgts,
    maternityOffsetInssPatronal: companyParams.maternity_offset_inss_patronal,
    thirteenthMode: isPj ? 'none' : input.thirteenthMode ?? 'none',
    minimumWage: companyParams.minimum_wage,
    patronalInssRate: companyParams.patronal_inss_rate,
    fgtsRate: companyParams.fgts_rate,
    vtCapRate: companyParams.vt_discount_cap_rate,
    applyLei15270: companyParams.apply_lei_15270,
    pjIssRate: companyParams.pj_default_iss_rate,
    pjIrrfRate: companyParams.pj_default_irrf_rate,
    pjPccRate: companyParams.pj_default_pcc_rate,
    pjAutoProportionalDates: companyParams.pj_auto_proportional_dates,
  });

  const payload = {
    tenant_id: tenantId,
    employee_id: input.employeeId,
    competence: input.competence,
    contract_type: contractType,
    base_salary: input.baseSalary,
    worked_days: input.workedDays,
    dependents_count: isPj ? 0 : input.dependentsCount,
    overtime_50_hours: isPj ? 0 : input.overtime50Hours,
    overtime_100_hours: isPj ? 0 : input.overtime100Hours,
    night_hours: isPj ? 0 : input.nightHours,
    insalubrity_rate: isPj ? 0 : input.insalubrityRate,
    hazard_pay: isPj ? false : input.hazardPay,
    bonuses: input.bonuses,
    absence_days: isPj ? 0 : input.absenceDays,
    vt_opted_in: isPj ? false : input.vtOptedIn,
    vr_discount: isPj ? 0 : input.vrDiscount,
    other_discounts: input.otherDiscounts,
    vacation_days: isPj ? 0 : input.vacationDays ?? 0,
    vacation_sold_days: isPj ? 0 : input.vacationSoldDays ?? 0,
    vacation_doubled_days: isPj ? 0 : input.vacationDoubledDays ?? 0,
    vacation_period_label: isPj ? null : input.vacationPeriodLabel || null,
    vacation_amount: calc.vacationAmount,
    vacation_abono_amount: calc.vacationAbonoAmount,
    vacation_double_amount: calc.vacationDoubleAmount,
    leave_type: isPj ? 'none' : input.leaveType ?? 'none',
    leave_days: isPj ? 0 : input.leaveDays ?? 0,
    leave_paid_amount: calc.leavePaidAmount,
    thirteenth_mode: isPj ? 'none' : input.thirteenthMode ?? 'none',
    thirteenth_amount: calc.thirteenthAmount,
    thirteenth_inss_amount: calc.thirteenthInssAmount,
    thirteenth_irrf_amount: calc.thirteenthIrrfAmount,
    maternity_inss_offset_amount: calc.maternityInssOffsetAmount,
    overtime_amount: calc.overtimeAmount,
    dsr_amount: calc.dsrAmount,
    night_shift_amount: calc.nightShiftAmount,
    insalubrity_amount: calc.insalubrityAmount,
    hazard_amount: calc.hazardAmount,
    gross_salary: calc.grossSalary,
    inss_amount: calc.inssAmount,
    irrf_amount: calc.irrfAmount,
    vt_discount_amount: calc.vtDiscountAmount,
    absence_discount_amount: calc.absenceDiscountAmount,
    pj_iss_amount: calc.pjIssAmount,
    pj_retention_amount: calc.pjRetentionAmount,
    total_discounts: calc.totalDiscounts,
    net_salary: calc.netSalary,
    fgts_amount: calc.fgtsAmount,
    inss_patronal_amount: calc.inssPatronalAmount,
    provision_13th: calc.provision13th,
    provision_vacation: calc.provisionVacation,
    nfse_number: isPj ? input.nfseNumber?.trim() || null : null,
    nfse_status: isPj
      ? input.nfseStatus || (companyParams.pj_require_nfse ? 'awaiting_issue' : 'not_applicable')
      : 'not_applicable',
    nfse_issued_at: isPj ? input.nfseIssuedAt || null : null,
    status: input.status || 'draft',
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('payroll_entries')
    .upsert(payload, { onConflict: 'tenant_id,employee_id,competence' })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Erro ao salvar lançamento.');
  return data as PayrollEntry;
}

export async function generateCompetencePayrollService(params: {
  tenantId: string;
  competence: string;
  employees: Employee[];
  jobs: Job[];
  payrollEntries: PayrollEntry[];
  companyParams?: PayrollParameters;
}): Promise<{ generated: number; skippedByDates: number }> {
  const { tenantId, competence, employees, jobs, payrollEntries } = params;
  const resolvedParams = params.companyParams || buildDefaultCompanyPayrollParameters(tenantId);

  const activeCandidates = employees.filter(
    (e) => e.status === 'active' || e.status === 'vacation' || Boolean(e.resignation_date)
  );
  if (activeCandidates.length === 0) return { generated: 0, skippedByDates: 0 };

  const existingForComp = new Set(
    payrollEntries.filter((p) => p.competence === competence).map((p) => p.employee_id)
  );

  let skippedByDates = 0;
  const rowsToInsert = activeCandidates
    .filter((emp) => !existingForComp.has(emp.id))
    .flatMap((emp) => {
      const eligibility = calculateWorkedDaysForCompetence(
        competence,
        emp.hire_date,
        emp.resignation_date
      );

      if (!eligibility.eligible || eligibility.workedDays <= 0) {
        skippedByDates += 1;
        return [];
      }

      const contractType: EmployeeContractType = emp.contract_type || 'clt';
      const isPj = contractType === 'pj';
      const baseSalary = resolveEmployeePayrollBaseSalary(emp, jobs);

      const dependentsCount = isPj ? 0 : emp.dependents_count ?? 0;
      const vtOptedIn = isPj ? false : emp.vt_opted_in ?? resolvedParams.default_vt_opted_in;
      const vrDiscount = isPj
        ? 0
        : Number(emp.vr_discount ?? resolvedParams.default_vr_discount ?? 0);
      const otherDiscounts = isPj ? 0 : Number(emp.health_plan_discount ?? 0);

      const calc = calculatePayrollByContractType(contractType, {
        baseSalary,
        workedDays: eligibility.workedDays,
        dependentsCount,
        overtime50Hours: 0,
        overtime100Hours: 0,
        nightHours: 0,
        insalubrityRate: 0,
        hazardPay: false,
        bonuses: 0,
        absenceDays: 0,
        vtOptedIn,
        vrDiscount,
        otherDiscounts,
        minimumWage: resolvedParams.minimum_wage,
        patronalInssRate: resolvedParams.patronal_inss_rate,
        fgtsRate: resolvedParams.fgts_rate,
        vtCapRate: resolvedParams.vt_discount_cap_rate,
        applyLei15270: resolvedParams.apply_lei_15270,
        pjIssRate: resolvedParams.pj_default_iss_rate,
        pjIrrfRate: resolvedParams.pj_default_irrf_rate,
        pjPccRate: resolvedParams.pj_default_pcc_rate,
        pjAutoProportionalDates: resolvedParams.pj_auto_proportional_dates,
      });

      return [
        {
          tenant_id: tenantId,
          employee_id: emp.id,
          competence,
          contract_type: contractType,
          base_salary: baseSalary,
          worked_days: eligibility.workedDays,
          dependents_count: dependentsCount,
          overtime_50_hours: 0,
          overtime_100_hours: 0,
          night_hours: 0,
          insalubrity_rate: 0,
          hazard_pay: false,
          bonuses: 0,
          absence_days: 0,
          vt_opted_in: vtOptedIn,
          vr_discount: vrDiscount,
          other_discounts: otherDiscounts,
          overtime_amount: calc.overtimeAmount,
          dsr_amount: calc.dsrAmount,
          night_shift_amount: calc.nightShiftAmount,
          insalubrity_amount: calc.insalubrityAmount,
          hazard_amount: calc.hazardAmount,
          gross_salary: calc.grossSalary,
          inss_amount: calc.inssAmount,
          irrf_amount: calc.irrfAmount,
          vt_discount_amount: calc.vtDiscountAmount,
          absence_discount_amount: calc.absenceDiscountAmount,
          pj_iss_amount: calc.pjIssAmount,
          pj_retention_amount: calc.pjRetentionAmount,
          total_discounts: calc.totalDiscounts,
          net_salary: calc.netSalary,
          fgts_amount: calc.fgtsAmount,
          inss_patronal_amount: calc.inssPatronalAmount,
          provision_13th: calc.provision13th,
          provision_vacation: calc.provisionVacation,
          nfse_status: isPj
            ? resolvedParams.pj_require_nfse
              ? 'awaiting_issue'
              : 'not_applicable'
            : 'not_applicable',
          status: 'draft',
          payslip_sent_status: 'pending',
          notes: eligibility.reason || null,
          updated_at: new Date().toISOString(),
        },
      ];
    });

  if (rowsToInsert.length === 0) return { generated: 0, skippedByDates };

  const { error } = await supabase.from('payroll_entries').insert(rowsToInsert);
  if (error) throw new Error(error.message);
  return { generated: rowsToInsert.length, skippedByDates };
}

export async function dispatchPayslipsService(
  tenantId: string,
  competence: string,
  entryIds?: string[]
): Promise<{
  providerConfigured: boolean;
  sentCount: number;
  failedCount: number;
  message?: string;
}> {
  const { data, error } = await supabase.functions.invoke('send-payslips', {
    body: { tenantId, competence, entryIds },
  });

  if (error) {
    return {
      providerConfigured: false,
      sentCount: 0,
      failedCount: 0,
      message: error.message || 'Envio automático indisponível no momento. Utilize o envio pelo seu cliente de e-mail.',
    };
  }

  const result = data as {
    providerConfigured?: boolean;
    sentCount?: number;
    failedCount?: number;
    message?: string;
  };

  return {
    providerConfigured: Boolean(result?.providerConfigured),
    sentCount: result?.sentCount ?? 0,
    failedCount: result?.failedCount ?? 0,
    message: result?.message,
  };
}

export async function updatePayslipDispatchStatusService(
  tenantId: string,
  entryIds: string[],
  payrollEntries: PayrollEntry[],
  employees: Employee[],
  status: PayslipSentStatus,
  channel = 'email_client'
): Promise<void> {
  if (entryIds.length === 0) return;
  const nowIso = new Date().toISOString();

  for (const id of entryIds) {
    const entry = payrollEntries.find((p) => p.id === id);
    const emp = employees.find((e) => e.id === entry?.employee_id);
    const { error } = await supabase
      .from('payroll_entries')
      .update({
        payslip_sent_status: status,
        payslip_sent_at: status === 'sent' ? nowIso : null,
        payslip_sent_channel: status === 'sent' ? channel : null,
        payslip_sent_to: status === 'sent' ? emp?.email || null : null,
        payslip_last_error: status === 'failed' ? 'Falha registrada manualmente' : null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
  }
}
