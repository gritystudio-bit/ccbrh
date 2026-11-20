import type { PayrollLeaveType, ThirteenthSalaryMode } from '../../types/database';
import { getEntitledVacationDaysByAbsences, getPayrollRules } from './rulesLoader';

export interface PayrollCalculationInput {
  baseSalary: number;
  workedDays?: number;
  dependentsCount?: number;
  overtime50Hours?: number;
  overtime100Hours?: number;
  nightHours?: number;
  insalubrityRate?: number; // 0, 10, 20, 40 (%)
  hazardPay?: boolean;
  bonuses?: number;
  absenceDays?: number;
  vtOptedIn?: boolean;
  vtEmployerValue?: number;
  vrDiscount?: number;
  otherDiscounts?: number;
  // Eventos de Férias (Arts. 129 a 145 CLT + Reforma Trabalhista Lei 13.467/2017)
  vacationDays?: number;
  vacationSoldDays?: number;
  vacationDoubledDays?: number; // Art. 137 CLT (Férias Vencidas pagas em dobro)
  vacationThirdRate?: number;
  // Eventos de Licenças & Afastamentos (Arts. 392, 473 e 476 CLT + Lei 8.213/91)
  leaveType?: PayrollLeaveType;
  leaveDays?: number;
  medicalLeaveCompanyPaidDays?: number;
  accidentLeaveKeepFgts?: boolean;
  maternityOffsetInssPatronal?: boolean;
  // Eventos de 13º Salário (Lei 4.090/62 + Art. 3º Lei 15.270/2025)
  thirteenthMode?: ThirteenthSalaryMode;
  // Parâmetros globais da empresa
  minimumWage?: number;
  patronalInssRate?: number;
  fgtsRate?: number;
  vtCapRate?: number;
  applyLei15270?: boolean;
  pjIssRate?: number;
  pjIrrfRate?: number;
  pjPccRate?: number;
  pjAutoProportionalDates?: boolean;
}

export interface IrrfBreakdownResult {
  irrfBeforeReduction: number;
  lei15270Reduction: number;
  irrfAmount: number;
}

export interface PayrollCalculationResult {
  proportionalBaseSalary: number;
  overtimeAmount: number;
  dsrAmount: number;
  nightShiftAmount: number;
  insalubrityAmount: number;
  hazardAmount: number;
  vacationAmount: number;
  vacationAbonoAmount: number;
  vacationDoubleAmount: number;
  leavePaidAmount: number;
  thirteenthAmount: number;
  thirteenthInssAmount: number;
  thirteenthIrrfAmount: number;
  maternityInssOffsetAmount: number;
  entitledVacationDaysByAbsences: number;
  grossSalary: number;
  inssAmount: number;
  irrfAmount: number;
  irrfBeforeReduction: number;
  lei15270Reduction: number;
  vtDiscountAmount: number;
  absenceDiscountAmount: number;
  pjIssAmount: number;
  pjRetentionAmount: number;
  totalDiscounts: number;
  netSalary: number;
  fgtsAmount: number;
  inssPatronalAmount: number;
  provision13th: number;
  provisionVacation: number;
  totalEmployerCost: number;
}

export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Calcula INSS progressivo mensal conforme faixas configuradas no YAML.
 */
export function calculateProgressiveINSS(grossBase: number): number {
  if (grossBase <= 0) return 0;

  const { inss_brackets } = getPayrollRules();
  let previousLimit = 0;
  let totalInss = 0;

  for (const bracket of inss_brackets) {
    if (grossBase <= previousLimit) break;
    const taxableSlice = Math.min(grossBase, bracket.up_to) - previousLimit;
    if (taxableSlice > 0) {
      totalInss += taxableSlice * bracket.rate;
    }
    previousLimit = bracket.up_to;
  }

  return round2(totalInss);
}

/**
 * Calcula IRRF mensal ou exclusivo na fonte (13º) comparando Deduções Legais vs. Desconto Simplificado
 * e aplicando o redutor da Lei nº 15.270/2025 (isenção até R$ 5.000 e transição até R$ 7.350).
 */
export function calculateIRRFBreakdown(
  grossBase: number,
  inss: number,
  dependentsCount: number,
  applyLei15270?: boolean
): IrrfBreakdownResult {
  if (grossBase <= 0) {
    return { irrfBeforeReduction: 0, lei15270Reduction: 0, irrfAmount: 0 };
  }

  const rules = getPayrollRules();
  const dependentDeduction = dependentsCount * rules.clt_defaults.dependent_deduction;
  const legalBase = Math.max(0, grossBase - inss - dependentDeduction);
  const simplifiedBase = Math.max(0, grossBase - rules.clt_defaults.simplified_irrf_discount);

  const computeTableTax = (base: number): number => {
    for (const row of rules.irrf_table) {
      if (row.up_to === null || base <= row.up_to) {
        return Math.max(0, base * row.rate - row.deduction);
      }
    }
    return 0;
  };

  const irrfBeforeReduction = round2(
    Math.min(computeTableTax(legalBase), computeTableTax(simplifiedBase))
  );
  const reductionRule = rules.irrf_lei_15270_reduction;
  const useReduction = applyLei15270 ?? reductionRule.enabled;

  if (!useReduction || irrfBeforeReduction <= 0) {
    return {
      irrfBeforeReduction,
      lei15270Reduction: 0,
      irrfAmount: irrfBeforeReduction,
    };
  }

  let rawReduction = 0;
  if (grossBase <= reductionRule.full_exemption_limit) {
    rawReduction = Math.min(irrfBeforeReduction, reductionRule.max_reduction_amount);
  } else if (grossBase <= reductionRule.transition_upper_limit) {
    const formulaReduction =
      reductionRule.transition_constant - reductionRule.transition_slope * grossBase;
    rawReduction = Math.min(irrfBeforeReduction, Math.max(0, formulaReduction));
  }

  const lei15270Reduction = round2(rawReduction);
  const irrfAmount = round2(Math.max(0, irrfBeforeReduction - lei15270Reduction));

  return {
    irrfBeforeReduction,
    lei15270Reduction,
    irrfAmount,
  };
}

export function calculateIRRF(
  grossBase: number,
  inss: number,
  dependentsCount: number,
  applyLei15270?: boolean
): number {
  return calculateIRRFBreakdown(grossBase, inss, dependentsCount, applyLei15270).irrfAmount;
}

/**
 * Calcula a folha mensal CLT completa com Férias, Abono Pecuniário, Licenças/Afastamentos e 13º Salário.
 */
export function calculateCltPayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const { clt_defaults, vacation_rules, leave_rules, thirteenth_salary_rules } = getPayrollRules();
  const monthDays = clt_defaults.commercial_month_days;

  const baseSalary = Math.max(0, Number(input.baseSalary) || 0);
  const workedDays = Math.min(31, Math.max(0, Number(input.workedDays ?? monthDays)));
  const dependentsCount = Math.max(0, Math.floor(Number(input.dependentsCount ?? 0)));
  const overtime50Hours = Math.max(0, Number(input.overtime50Hours ?? 0));
  const overtime100Hours = Math.max(0, Number(input.overtime100Hours ?? 0));
  const nightHours = Math.max(0, Number(input.nightHours ?? 0));
  const insalubrityRate = Number(input.insalubrityRate ?? 0);
  const hazardPay = Boolean(input.hazardPay);
  const bonuses = Math.max(0, Number(input.bonuses ?? 0));
  const absenceDays = Math.min(31, Math.max(0, Number(input.absenceDays ?? 0)));
  const vtOptedIn = input.vtOptedIn ?? clt_defaults.default_vt_opted_in;
  const vtEmployerValue = Math.max(0, Number(input.vtEmployerValue ?? 0));
  const vrDiscount = Math.max(0, Number(input.vrDiscount ?? clt_defaults.default_vr_discount));
  const otherDiscounts = Math.max(0, Number(input.otherDiscounts ?? 0));
  const minimumWage = Math.max(0, Number(input.minimumWage ?? clt_defaults.minimum_wage));
  const patronalInssRate = Math.max(
    0,
    Number(input.patronalInssRate ?? clt_defaults.patronal_inss_rate)
  );
  const fgtsRate = Math.max(0, Number(input.fgtsRate ?? clt_defaults.fgts_rate));
  const vtCapRate = Math.max(0, Number(input.vtCapRate ?? clt_defaults.vt_discount_cap_rate));

  // Parâmetros de Férias (Art. 142, 143 e 137 CLT)
  const vacationDays = Math.min(30, Math.max(0, Math.floor(Number(input.vacationDays ?? 0))));
  const vacationSoldDays = Math.min(
    vacation_rules.abono_pecuniario_max_days,
    Math.max(0, Math.floor(Number(input.vacationSoldDays ?? 0)))
  );
  const vacationDoubledDays = Math.min(
    30,
    Math.max(0, Math.floor(Number(input.vacationDoubledDays ?? 0)))
  );
  const vacationThirdRate = Number(
    input.vacationThirdRate ?? vacation_rules.constitutional_third_rate
  );

  // Parâmetros de Licenças e Afastamentos (Arts. 392, 473 e 476 CLT)
  const leaveType: PayrollLeaveType = input.leaveType || 'none';
  const leaveDays =
    leaveType === 'none' ? 0 : Math.min(31, Math.max(0, Math.floor(Number(input.leaveDays ?? 0))));
  const medicalCompanyPaidLimit = Number(
    input.medicalLeaveCompanyPaidDays ?? leave_rules.medical_leave_company_paid_days
  );
  const accidentKeepFgts = input.accidentLeaveKeepFgts ?? leave_rules.accident_leave_keep_fgts;
  const maternityOffsetInss =
    input.maternityOffsetInssPatronal ?? leave_rules.maternity_offset_inss_patronal;

  // Parâmetros de 13º Salário (Lei 4.090/62 + Art. 3º Lei 15.270/2025)
  const thirteenthMode: ThirteenthSalaryMode = input.thirteenthMode || 'none';

  const dailySalary = baseSalary / monthDays;
  const hourlyRate = baseSalary / clt_defaults.monthly_hours_divisor;

  // 1. Salário proporcional aos dias efetivamente trabalhados na competência
  const proportionalBaseSalary = round2(dailySalary * workedDays);

  // 2. Férias Gozadas + 1/3 Constitucional (Tributável), Abono Pecuniário + 1/3 (Isento) e Dobra Art. 137 CLT
  const vacationBasePay = dailySalary * vacationDays;
  const vacationAmount =
    vacationDays > 0 ? round2(vacationBasePay * (1 + vacationThirdRate)) : 0;

  const abonoBasePay = dailySalary * vacationSoldDays;
  const vacationAbonoAmount =
    vacationSoldDays > 0 ? round2(abonoBasePay * (1 + vacationThirdRate)) : 0;

  // Art. 137 CLT: A dobra de férias vencidas + 1/3 tem natureza indenizatória (Art. 28 §9º "d" Lei 8.212/91)
  const doubleBasePay = dailySalary * vacationDoubledDays;
  const vacationDoubleAmount =
    vacationDoubledDays > 0 ? round2(doubleBasePay * (1 + vacationThirdRate)) : 0;

  // 3. Remuneração de Licenças / Afastamentos a cargo da empresa
  let companyPaidLeaveDays = 0;
  if (leaveDays > 0) {
    if (leaveType === 'medical' || leaveType === 'work_accident') {
      companyPaidLeaveDays = Math.min(leaveDays, medicalCompanyPaidLimit);
    } else if (
      leaveType === 'maternity' ||
      leaveType === 'paternity' ||
      leaveType === 'marriage' ||
      leaveType === 'bereavement'
    ) {
      companyPaidLeaveDays = leaveDays;
    } else if (leaveType === 'unpaid') {
      companyPaidLeaveDays = 0;
    }
  }
  const leavePaidAmount = round2(dailySalary * companyPaidLeaveDays);

  // 4. Horas Extras, Adicional Noturno, DSR, Insalubridade e Periculosidade
  const overtimeAmount = round2(
    overtime50Hours * hourlyRate * clt_defaults.overtime_50_multiplier +
      overtime100Hours * hourlyRate * clt_defaults.overtime_100_multiplier
  );
  const nightShiftAmount = round2(
    nightHours *
      clt_defaults.night_hour_reduction_factor *
      hourlyRate *
      clt_defaults.night_shift_rate
  );
  const dsrAmount = round2((overtimeAmount + nightShiftAmount) * clt_defaults.dsr_default_ratio);
  const insalubrityAmount =
    insalubrityRate > 0 ? round2((minimumWage * insalubrityRate) / 100) : 0;
  const hazardAmount = hazardPay ? round2(baseSalary * clt_defaults.hazard_pay_rate) : 0;
  const absenceDiscountAmount = round2(dailySalary * absenceDays);

  // 5. Cálculo de 13º Salário (Tributação Exclusiva na Fonte conforme Art. 3º da Lei 15.270/2025)
  let thirteenthAmount = 0;
  let thirteenthInssAmount = 0;
  let thirteenthIrrfAmount = 0;

  if (thirteenthMode === 'first_installment') {
    thirteenthAmount = round2(baseSalary * thirteenth_salary_rules.first_installment_share);
  } else if (thirteenthMode === 'second_installment') {
    // Na 2ª parcela, lança a segunda metade bruta e desconta INSS e IRRF sobre o 13º integral
    thirteenthAmount = round2(baseSalary * (1 - thirteenth_salary_rules.first_installment_share));
    thirteenthInssAmount = calculateProgressiveINSS(baseSalary);
    thirteenthIrrfAmount = calculateIRRFBreakdown(
      baseSalary,
      thirteenthInssAmount,
      dependentsCount,
      input.applyLei15270
    ).irrfAmount;
  } else if (thirteenthMode === 'full_single') {
    thirteenthAmount = round2(baseSalary);
    thirteenthInssAmount = calculateProgressiveINSS(baseSalary);
    thirteenthIrrfAmount = calculateIRRFBreakdown(
      baseSalary,
      thirteenthInssAmount,
      dependentsCount,
      input.applyLei15270
    ).irrfAmount;
  }

  // 6. Total Bruto e Base Tributável Mensal (Abono Pecuniário e 13º não entram na base mensal de INSS/IRRF)
  const taxableMonthlyEarnings = round2(
    proportionalBaseSalary +
      vacationAmount +
      leavePaidAmount +
      overtimeAmount +
      dsrAmount +
      nightShiftAmount +
      insalubrityAmount +
      hazardAmount +
      bonuses
  );

  const grossSalary = round2(
    taxableMonthlyEarnings + vacationAbonoAmount + vacationDoubleAmount + thirteenthAmount
  );

  const contributionBase = Math.max(0, round2(taxableMonthlyEarnings - absenceDiscountAmount));
  const monthlyInssAmount = calculateProgressiveINSS(contributionBase);
  const irrfBreakdown = calculateIRRFBreakdown(
    contributionBase,
    monthlyInssAmount,
    dependentsCount,
    input.applyLei15270
  );

  const inssAmount = round2(monthlyInssAmount + thirteenthInssAmount);
  const irrfAmount = round2(irrfBreakdown.irrfAmount + thirteenthIrrfAmount);

  // Vale-Transporte incide apenas sobre os dias efetivamente trabalhados e é limitado ao menor valor
  // entre 6% do salário proporcional e o custo efetivo custeado pelo empregador (Art. 4º parágrafo único Lei 7.418/85)
  const rawVtCap = round2(proportionalBaseSalary * vtCapRate);
  const vtDiscountAmount = vtOptedIn
    ? vtEmployerValue > 0
      ? round2(Math.min(rawVtCap, vtEmployerValue))
      : rawVtCap
    : 0;

  const totalDiscounts = round2(
    inssAmount +
      irrfAmount +
      vtDiscountAmount +
      absenceDiscountAmount +
      vrDiscount +
      otherDiscounts
  );

  const netSalary = round2(Math.max(0, grossSalary - totalDiscounts));

  // 7. FGTS (8%): no Acidente de Trabalho (Art. 15 §5º Lei 8.036/90), mantém FGTS sobre os dias afastados pelo INSS
  const unpaidAccidentDays =
    leaveType === 'work_accident' && accidentKeepFgts
      ? Math.max(0, leaveDays - companyPaidLeaveDays)
      : 0;
  const fgtsBase = round2(
    contributionBase + thirteenthAmount + dailySalary * unpaidAccidentDays
  );
  const fgtsAmount = round2(fgtsBase * fgtsRate);

  // 8. INSS Patronal e Compensação de Salário-Maternidade (Lei 8.213/91 Art. 72 §1º)
  const rawPatronalBase = round2(contributionBase + thirteenthAmount);
  const rawInssPatronal = round2(rawPatronalBase * patronalInssRate);
  const maternityInssOffsetAmount =
    leaveType === 'maternity' && maternityOffsetInss ? leavePaidAmount : 0;
  const inssPatronalAmount = round2(Math.max(0, rawInssPatronal - maternityInssOffsetAmount));

  const provision13th = round2(contributionBase / 12);
  const provisionVacation = round2((contributionBase / 12) * (1 + vacationThirdRate));
  const totalEmployerCost = round2(
    Math.max(
      0,
      grossSalary -
        maternityInssOffsetAmount +
        fgtsAmount +
        inssPatronalAmount +
        provision13th +
        provisionVacation
    )
  );

  return {
    proportionalBaseSalary,
    overtimeAmount,
    dsrAmount,
    nightShiftAmount,
    insalubrityAmount,
    hazardAmount,
    vacationAmount,
    vacationAbonoAmount,
    vacationDoubleAmount,
    leavePaidAmount,
    thirteenthAmount,
    thirteenthInssAmount,
    thirteenthIrrfAmount,
    maternityInssOffsetAmount,
    entitledVacationDaysByAbsences: getEntitledVacationDaysByAbsences(absenceDays),
    grossSalary,
    inssAmount,
    irrfAmount,
    irrfBeforeReduction: irrfBreakdown.irrfBeforeReduction,
    lei15270Reduction: irrfBreakdown.lei15270Reduction,
    vtDiscountAmount,
    absenceDiscountAmount,
    pjIssAmount: 0,
    pjRetentionAmount: 0,
    totalDiscounts,
    netSalary,
    fgtsAmount,
    inssPatronalAmount,
    provision13th,
    provisionVacation,
    totalEmployerCost,
  };
}
