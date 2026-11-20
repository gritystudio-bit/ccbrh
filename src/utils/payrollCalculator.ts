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
import {
  calculateEndDateIso,
  checkArt134Par3StartDate,
  estimateVacationFinancials,
  subtractDaysIso,
  validateVacationRequest,
  type VacationFinancialEstimate,
  type VacationValidationResult,
} from './payroll/vacationValidation';
import {
  BENEFIT_TYPE_CATALOG,
  calculateSingleBenefitMonthlyImpact,
  summarizeEmployeeBenefits,
  type BenefitCatalogMeta,
  type EmployeeBenefitsSummary,
  type SingleBenefitMonthlyImpact,
} from './payroll/benefitsCalculator';

export type {
  BenefitCatalogMeta,
  CompetenceEligibilityResult,
  EmployeeBenefitsSummary,
  EmployeeVacationSummary,
  IrrfBreakdownResult,
  PayrollCalculationInput,
  PayrollCalculationResult,
  PayrollRulesConfig,
  SingleBenefitMonthlyImpact,
  VacationCyclePeriod,
  VacationCycleStatus,
  VacationFinancialEstimate,
  VacationValidationResult,
};

export {
  BENEFIT_TYPE_CATALOG,
  analyzeEmployeeVacationCycles,
  buildDefaultCompanyPayrollParameters,
  calculateCltPayroll,
  calculateEndDateIso,
  calculateIRRF,
  calculateIRRFBreakdown,
  calculatePjPayment,
  calculateProgressiveINSS,
  calculateSingleBenefitMonthlyImpact,
  calculateWorkedDaysForCompetence,
  checkArt134Par3StartDate,
  estimateVacationFinancials,
  formatIsoDateBR,
  getEntitledVacationDaysByAbsences,
  getPayrollRules,
  subtractDaysIso,
  summarizeEmployeeBenefits,
  validateVacationRequest,
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
