import type { EmployeeContractType } from '../types/database';
import {
  calculateCltPayroll,
  calculateIRRF,
  calculateIRRFBreakdown,
  calculateProgressiveINSS,
  type IrrfBreakdownResult,
  type PayrollCalculationInput,
  type PayrollCalculationResult,
} from './payroll/cltCalculator';
import { calculatePjPayment } from './payroll/pjCalculator';
import {
  calculateWorkedDaysForCompetence,
  type CompetenceEligibilityResult,
} from './payroll/competenceDates';
import {
  buildDefaultCompanyPayrollParameters,
  getEntitledVacationDaysByAbsences,
  getPayrollRules,
  type PayrollRulesConfig,
} from './payroll/rulesLoader';
import {
  analyzeEmployeeVacationCycles,
  formatIsoDateBR,
  type EmployeeVacationSummary,
  type VacationCyclePeriod,
  type VacationCycleStatus,
} from './payroll/vacationCycles';

export type {
  CompetenceEligibilityResult,
  EmployeeVacationSummary,
  IrrfBreakdownResult,
  PayrollCalculationInput,
  PayrollCalculationResult,
  PayrollRulesConfig,
  VacationCyclePeriod,
  VacationCycleStatus,
};

export {
  analyzeEmployeeVacationCycles,
  buildDefaultCompanyPayrollParameters,
  calculateCltPayroll,
  calculateIRRF,
  calculateIRRFBreakdown,
  calculatePjPayment,
  calculateProgressiveINSS,
  calculateWorkedDaysForCompetence,
  formatIsoDateBR,
  getEntitledVacationDaysByAbsences,
  getPayrollRules,
};

/**
 * Orquestrador de cálculo trabalhista/contratual:
 * despacha automaticamente para o motor CLT (PF + Lei 15.270/2025) ou PJ (NFS-e).
 */
export function calculatePayrollByContractType(
  contractType: EmployeeContractType | undefined,
  input: PayrollCalculationInput
): PayrollCalculationResult {
  if (contractType === 'pj') {
    return calculatePjPayment(input);
  }
  return calculateCltPayroll(input);
}
