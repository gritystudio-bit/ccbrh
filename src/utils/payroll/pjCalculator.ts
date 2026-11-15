import { getPayrollRules } from './rulesLoader';
import { PayrollCalculationInput, PayrollCalculationResult, round2 } from './cltCalculator';

/**
 * Calcula o fechamento de prestador PJ (Pessoa Jurídica):
 * - Foco no valor a emitir na NFS-e e retenções na fonte configuradas (ISS/IRRF/PCC).
 * - Não gera INSS CLT, IRRF PF, FGTS, VT, 13º ou Férias.
 */
export function calculatePjPayment(input: PayrollCalculationInput): PayrollCalculationResult {
  const { clt_defaults, pj_defaults } = getPayrollRules();
  const monthDays = clt_defaults.commercial_month_days;

  const baseValue = Math.max(0, Number(input.baseSalary) || 0);
  const workedDays = Math.min(31, Math.max(0, Number(input.workedDays ?? monthDays)));
  const useProportional = input.pjAutoProportionalDates ?? pj_defaults.auto_proportional_dates;
  const proportionalBaseSalary = useProportional
    ? round2((baseValue / monthDays) * workedDays)
    : round2(baseValue);

  const bonuses = Math.max(0, Number(input.bonuses ?? 0));
  const otherDiscounts = Math.max(0, Number(input.otherDiscounts ?? 0));

  const issRate = Math.max(0, Number(input.pjIssRate ?? pj_defaults.default_iss_rate));
  const irrfRate = Math.max(0, Number(input.pjIrrfRate ?? pj_defaults.default_irrf_rate));
  const pccRate = Math.max(0, Number(input.pjPccRate ?? pj_defaults.default_pcc_rate));

  // Valor total a ser emitido na Nota Fiscal de Serviço (NFS-e)
  const grossSalary = round2(proportionalBaseSalary + bonuses);
  const pjIssAmount = round2(grossSalary * issRate);
  const pjRetentionAmount = round2(grossSalary * (irrfRate + pccRate));
  const totalDiscounts = round2(pjIssAmount + pjRetentionAmount + otherDiscounts);
  const netSalary = round2(Math.max(0, grossSalary - totalDiscounts));

  return {
    proportionalBaseSalary,
    overtimeAmount: 0,
    dsrAmount: 0,
    nightShiftAmount: 0,
    insalubrityAmount: 0,
    hazardAmount: 0,
    vacationAmount: 0,
    vacationAbonoAmount: 0,
    vacationDoubleAmount: 0,
    leavePaidAmount: 0,
    thirteenthAmount: 0,
    thirteenthInssAmount: 0,
    thirteenthIrrfAmount: 0,
    maternityInssOffsetAmount: 0,
    entitledVacationDaysByAbsences: 0,
    grossSalary,
    inssAmount: 0,
    irrfAmount: 0,
    irrfBeforeReduction: 0,
    lei15270Reduction: 0,
    vtDiscountAmount: 0,
    absenceDiscountAmount: 0,
    pjIssAmount,
    pjRetentionAmount,
    totalDiscounts,
    netSalary,
    fgtsAmount: 0,
    inssPatronalAmount: 0,
    provision13th: 0,
    provisionVacation: 0,
    totalEmployerCost: grossSalary,
  };
}
