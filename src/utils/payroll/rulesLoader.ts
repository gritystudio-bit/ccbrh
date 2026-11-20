import { parse } from 'yaml';
import rawPayrollRulesYaml from '../../../config/payroll-rules.yaml?raw';
import type { PayrollParameters } from '../../types/database';

export interface InssBracketRule {
  up_to: number;
  rate: number;
}

export interface IrrfTableRule {
  up_to: number | null;
  rate: number;
  deduction: number;
}

export interface IrrfLei15270Rule {
  enabled: boolean;
  legal_reference: string;
  full_exemption_limit: number;
  max_reduction_amount: number;
  transition_upper_limit: number;
  transition_constant: number;
  transition_slope: number;
}

export interface CltDefaultRules {
  minimum_wage: number;
  patronal_inss_rate: number;
  fgts_rate: number;
  monthly_hours_divisor: number;
  commercial_month_days: number;
  overtime_50_multiplier: number;
  overtime_100_multiplier: number;
  night_shift_rate: number;
  night_hour_reduction_factor: number;
  dsr_default_ratio: number;
  hazard_pay_rate: number;
  vt_discount_cap_rate: number;
  default_vt_opted_in: boolean;
  default_vr_discount: number;
  dependent_deduction: number;
  simplified_irrf_discount: number;
}

export interface VacationAbsenceScaleRule {
  max_absences: number;
  entitled_days: number;
}

export interface VacationRules {
  legal_reference: string;
  standard_vacation_days: number;
  concessive_period_months: number;
  expired_concessive_double_pay: boolean;
  constitutional_third_rate: number;
  abono_pecuniario_max_days: number;
  max_split_periods: number;
  min_first_split_days: number;
  min_other_split_days: number;
  notice_min_days: number;
  payment_before_start_days: number;
  abono_request_before_acquisitive_end_days: number;
  forbid_start_days_before_holiday_or_dsr: number;
  collective_min_days: number;
  pro_rata_min_days_for_month: number;
  absence_reduction_scale: VacationAbsenceScaleRule[];
}

export interface BenefitRules {
  legal_reference: string;
  vt_cap_by_actual_cost: boolean;
  pat_employee_discount_cap_rate: number;
  childcare_max_age_months: number;
  allow_cash_meal_allowance: boolean;
}

export interface LeaveRules {
  legal_reference: string;
  medical_leave_company_paid_days: number;
  accident_leave_keep_fgts: boolean;
  maternity_leave_days: number;
  maternity_offset_inss_patronal: boolean;
  paternity_leave_days: number;
  marriage_leave_days: number;
  bereavement_leave_days: number;
}

export interface ThirteenthSalaryRules {
  legal_reference: string;
  first_installment_share: number;
  apply_lei_15270_exclusive_irrf: boolean;
}

export interface PjDefaultRules {
  require_nfse: boolean;
  nfse_due_day: number;
  auto_proportional_dates: boolean;
  default_iss_rate: number;
  default_irrf_rate: number;
  default_pcc_rate: number;
  legal_note: string;
}

export interface PayrollRulesConfig {
  meta: {
    version: string;
    effective_from: string;
    legal_basis: string[];
  };
  clt_defaults: CltDefaultRules;
  vacation_rules: VacationRules;
  benefit_rules: BenefitRules;
  leave_rules: LeaveRules;
  thirteenth_salary_rules: ThirteenthSalaryRules;
  inss_brackets: InssBracketRule[];
  irrf_table: IrrfTableRule[];
  irrf_lei_15270_reduction: IrrfLei15270Rule;
  pj_defaults: PjDefaultRules;
}

let cachedRules: PayrollRulesConfig | null = null;

/**
 * Carrega e valida as regras oficiais PF/CLT e PJ a partir de config/payroll-rules.yaml.
 */
export function getPayrollRules(): PayrollRulesConfig {
  if (!cachedRules) {
    cachedRules = parse(rawPayrollRulesYaml) as PayrollRulesConfig;
  }
  return cachedRules;
}

/**
 * Calcula quantos dias de férias o colaborador tem direito conforme faltas injustificadas (Art. 130 CLT).
 */
export function getEntitledVacationDaysByAbsences(unjustifiedAbsences: number): number {
  const { vacation_rules } = getPayrollRules();
  const cleanAbsences = Math.max(0, Math.floor(unjustifiedAbsences));
  for (const row of vacation_rules.absence_reduction_scale) {
    if (cleanAbsences <= row.max_absences) {
      return row.entitled_days;
    }
  }
  return 0;
}

/**
 * Constrói os parâmetros padrão editáveis de uma empresa com base no YAML oficial.
 */
export function buildDefaultCompanyPayrollParameters(tenantId: string): PayrollParameters {
  const rules = getPayrollRules();
  return {
    tenant_id: tenantId,
    minimum_wage: rules.clt_defaults.minimum_wage,
    patronal_inss_rate: rules.clt_defaults.patronal_inss_rate,
    fgts_rate: rules.clt_defaults.fgts_rate,
    vt_discount_cap_rate: rules.clt_defaults.vt_discount_cap_rate,
    default_vt_opted_in: rules.clt_defaults.default_vt_opted_in,
    default_vr_discount: rules.clt_defaults.default_vr_discount,
    apply_lei_15270: rules.irrf_lei_15270_reduction.enabled,
    vacation_constitutional_third_rate: rules.vacation_rules.constitutional_third_rate,
    vacation_abono_max_days: rules.vacation_rules.abono_pecuniario_max_days,
    vacation_min_first_split_days: rules.vacation_rules.min_first_split_days,
    vacation_min_other_split_days: rules.vacation_rules.min_other_split_days,
    vacation_concessive_months: rules.vacation_rules.concessive_period_months,
    vacation_expired_double_pay: rules.vacation_rules.expired_concessive_double_pay,
    medical_leave_company_paid_days: rules.leave_rules.medical_leave_company_paid_days,
    maternity_leave_days: rules.leave_rules.maternity_leave_days,
    paternity_leave_days: rules.leave_rules.paternity_leave_days,
    marriage_leave_days: rules.leave_rules.marriage_leave_days,
    bereavement_leave_days: rules.leave_rules.bereavement_leave_days,
    accident_leave_keep_fgts: rules.leave_rules.accident_leave_keep_fgts,
    maternity_offset_inss_patronal: rules.leave_rules.maternity_offset_inss_patronal,
    pj_default_iss_rate: rules.pj_defaults.default_iss_rate,
    pj_default_irrf_rate: rules.pj_defaults.default_irrf_rate,
    pj_default_pcc_rate: rules.pj_defaults.default_pcc_rate,
    pj_require_nfse: rules.pj_defaults.require_nfse,
    pj_nfse_due_day: rules.pj_defaults.nfse_due_day,
    pj_auto_proportional_dates: rules.pj_defaults.auto_proportional_dates,
  };
}
