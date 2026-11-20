import type { EmployeeVacationRecord, PayrollParameters } from '../../types/database';
import {
  calculateIRRFBreakdown,
  calculateProgressiveINSS,
  round2,
} from './cltCalculator';
import { getEntitledVacationDaysByAbsences, getPayrollRules } from './rulesLoader';
import type { VacationCyclePeriod } from './vacationCycles';

// Feriados nacionais fixos brasileiros (Lei nº 662/1949, Lei nº 6.802/1980 e Lei nº 14.759/2023)
const FIXED_NATIONAL_HOLIDAYS_MM_DD = new Set([
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalhador
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia Nacional de Zumbi e da Consciência Negra
  '12-25', // Natal
]);

export interface VacationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entitledDaysByAbsences: number;
  fractionNumber: number;
  endDate: string;
  noticeDueDate: string;
  paymentDueDate: string;
  doubledDays: number;
}

export interface VacationFinancialEstimate {
  dailySalary: number;
  vacationBaseAmount: number;
  constitutionalThirdAmount: number;
  grossVacationAmount: number;
  abonoBaseAmount: number;
  abonoThirdAmount: number;
  totalAbonoAmount: number;
  doubleAmount: number;
  estimatedInss: number;
  estimatedIrrf: number;
  totalGrossWithAbonoAndDouble: number;
  estimatedNetAmount: number;
}

function parseIsoUtc(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function addDaysIsoDate(isoDate: string, deltaDays: number): string {
  const d = parseIsoUtc(isoDate);
  if (!d) return isoDate;
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function subtractDaysIso(isoDate: string, days: number): string {
  return addDaysIsoDate(isoDate, -days);
}

/**
 * Retorna a data de término do gozo de férias (inclusiva): startDate + daysTaken - 1.
 */
export function calculateEndDateIso(startDateIso: string, daysTaken: number): string {
  const safeDays = Math.max(1, Math.floor(daysTaken));
  return addDaysIsoDate(startDateIso, safeDays - 1);
}

/**
 * Art. 134 §3º CLT (Lei 13.467/2017):
 * É vedado o início das férias no período de dois dias que antecede feriado ou dia de repouso semanal remunerado.
 * Considera domingo (UTC day === 0) como DSR padrão (vedando sexta e sábado) + feriados nacionais fixos.
 */
export function checkArt134Par3StartDate(startDateIso: string): {
  allowed: boolean;
  reason?: string;
} {
  const startDate = parseIsoUtc(startDateIso);
  if (!startDate) {
    return { allowed: false, reason: 'Data de início inválida.' };
  }

  const rules = getPayrollRules();
  const forbidWindow = rules.vacation_rules.forbid_start_days_before_holiday_or_dsr || 2;
  const dayOfWeek = startDate.getUTCDay(); // 0=Dom, 5=Sex, 6=Sab

  if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
    return {
      allowed: false,
      reason:
        'Art. 134 §3º CLT: é vedado iniciar férias nos 2 dias que antecedem o repouso semanal remunerado (DSR/domingo). Escolha um dia entre segunda e quinta-feira.',
    };
  }

  for (let offset = 1; offset <= forbidWindow; offset++) {
    const upcomingIso = addDaysIsoDate(startDateIso, offset);
    const mmDd = upcomingIso.slice(5, 10);
    if (FIXED_NATIONAL_HOLIDAYS_MM_DD.has(mmDd)) {
      return {
        allowed: false,
        reason: `Art. 134 §3º CLT: a data escolhida antecede em ${offset} dia(s) o feriado nacional de ${upcomingIso.slice(8, 10)}/${upcomingIso.slice(5, 7)}.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Valida integralmente uma programação/solicitação de férias CLT conforme
 * Decreto-Lei 5.452/1943 (Arts. 130, 134, 135, 137, 143 e 145) e Lei 13.467/2017.
 */
export function validateVacationRequest(params: {
  contractType: 'clt' | 'pj';
  cycle: VacationCyclePeriod | null;
  startDate: string;
  daysTaken: number;
  soldDays: number;
  unjustifiedAbsences: number;
  existingCycleRecords?: EmployeeVacationRecord[];
  referenceTodayIso?: string;
  companyParams?: PayrollParameters;
}): VacationValidationResult {
  const rules = getPayrollRules();
  const vRules = rules.vacation_rules;
  const {
    contractType,
    cycle,
    startDate,
    daysTaken,
    soldDays,
    unjustifiedAbsences,
    existingCycleRecords = [],
    referenceTodayIso = new Date().toISOString().slice(0, 10),
    companyParams,
  } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  const entitledDaysByAbsences = getEntitledVacationDaysByAbsences(unjustifiedAbsences);
  const safeDaysTaken = Math.floor(daysTaken || 0);
  const safeSoldDays = Math.floor(soldDays || 0);
  const endDate = startDate ? calculateEndDateIso(startDate, Math.max(1, safeDaysTaken)) : '';
  const noticeDueDate = startDate ? subtractDaysIso(startDate, vRules.notice_min_days) : '';
  const paymentDueDate = startDate
    ? subtractDaysIso(startDate, vRules.payment_before_start_days)
    : '';

  const minFirstSplit =
    companyParams?.vacation_min_first_split_days ?? vRules.min_first_split_days;
  const minOtherSplit =
    companyParams?.vacation_min_other_split_days ?? vRules.min_other_split_days;
  const maxAbonoDays = Math.min(
    companyParams?.vacation_abono_max_days ?? vRules.abono_pecuniario_max_days,
    Math.floor(entitledDaysByAbsences / 3)
  );

  if (contractType === 'pj') {
    errors.push(
      'Contrato PJ não possui férias CLT regulamentadas. Utilize o controle de descanso acordado apenas em contratos CLT.'
    );
  }

  if (!cycle) {
    errors.push('Selecione um período aquisitivo válido.');
  } else if (cycle.status === 'acquiring') {
    warnings.push(
      `Período aquisitivo ${cycle.label} ainda em curso (${cycle.proportionalMonths || 0}/12 avos). Concessão individual antes de completar 12 meses aplica-se apenas em férias coletivas (Art. 140 CLT).`
    );
  }

  if (entitledDaysByAbsences === 0) {
    errors.push(
      'Art. 130/133 CLT: colaborador com mais de 32 faltas injustificadas no período aquisitivo perde o direito às férias deste ciclo.'
    );
  }

  if (!startDate || !parseIsoUtc(startDate)) {
    errors.push('Informe uma data de início válida.');
  } else {
    const startCheck = checkArt134Par3StartDate(startDate);
    if (!startCheck.allowed && startCheck.reason) {
      errors.push(startCheck.reason);
    }

    if (noticeDueDate && referenceTodayIso > noticeDueDate) {
      warnings.push(
        `Art. 135 CLT: o aviso prévio por escrito deve ocorrer até ${noticeDueDate.split('-').reverse().join('/')} (${vRules.notice_min_days} dias antes do início).`
      );
    }
  }

  const activeInSameCycle = existingCycleRecords.filter(
    (r) =>
      r.status !== 'canceled' &&
      r.status !== 'rejected' &&
      (!cycle || r.acquisitive_period_label === cycle.label)
  );

  const fractionNumber = activeInSameCycle.length + 1;
  if (fractionNumber > vRules.max_split_periods) {
    errors.push(
      `Art. 134 §1º CLT: as férias podem ser fracionadas em no máximo ${vRules.max_split_periods} períodos por ciclo aquisitivo.`
    );
  }

  if (safeDaysTaken < minOtherSplit) {
    errors.push(
      `Art. 134 §1º CLT: nenhum período de férias pode ser inferior a ${minOtherSplit} dias corridos.`
    );
  }

  const alreadyHasLongSplit = activeInSameCycle.some(
    (r) => Number(r.days_taken || 0) >= minFirstSplit
  );
  const effectiveCycleAvailable = cycle
    ? Math.min(cycle.remainingDays, Math.max(0, entitledDaysByAbsences - cycle.takenDays - cycle.soldDays))
    : entitledDaysByAbsences;

  if (safeDaysTaken + safeSoldDays > effectiveCycleAvailable) {
    errors.push(
      `Saldo insuficiente no ciclo: solicitando ${safeDaysTaken + safeSoldDays} dia(s) (${safeDaysTaken} gozo + ${safeSoldDays} abono) com apenas ${effectiveCycleAvailable} dia(s) disponível(is).`
    );
  }

  const remainingAfterRequest = effectiveCycleAvailable - safeDaysTaken - safeSoldDays;

  if (remainingAfterRequest > 0 && remainingAfterRequest < minOtherSplit) {
    errors.push(
      `Art. 134 §1º CLT: restariam ${remainingAfterRequest} dia(s) no ciclo, abaixo do mínimo legal de ${minOtherSplit} dias por fração.`
    );
  }

  if (!alreadyHasLongSplit && safeDaysTaken < minFirstSplit) {
    if (remainingAfterRequest < minFirstSplit || fractionNumber >= vRules.max_split_periods) {
      errors.push(
        `Art. 134 §1º CLT: ao menos um dos períodos do ciclo deve ter no mínimo ${minFirstSplit} dias corridos.`
      );
    }
  }

  if (safeSoldDays > maxAbonoDays) {
    errors.push(
      `Art. 143 CLT: o abono pecuniário não pode exceder 1/3 das férias devidas (máximo de ${maxAbonoDays} dias para ${entitledDaysByAbsences}d de direito).`
    );
  }

  if (safeSoldDays > 0 && cycle) {
    const abonoDeadline = subtractDaysIso(
      cycle.acquisitiveEnd,
      vRules.abono_request_before_acquisitive_end_days
    );
    if (referenceTodayIso > abonoDeadline) {
      warnings.push(
        `Art. 143 §1º CLT: o abono pecuniário deve ser requerido formalmente até ${abonoDeadline.split('-').reverse().join('/')} (15 dias antes do fim do período aquisitivo).`
      );
    }
  }

  // Cálculo automático de dias vencidos em dobro (Art. 137 CLT)
  let doubledDays = 0;
  if (
    cycle &&
    startDate &&
    endDate &&
    (companyParams?.vacation_expired_double_pay ?? vRules.expired_concessive_double_pay)
  ) {
    if (startDate > cycle.concessiveLimit) {
      doubledDays = safeDaysTaken;
    } else if (endDate > cycle.concessiveLimit) {
      const limitMs = parseIsoUtc(cycle.concessiveLimit)?.getTime() ?? 0;
      const endMs = parseIsoUtc(endDate)?.getTime() ?? 0;
      const diff = Math.floor((endMs - limitMs) / (1000 * 60 * 60 * 24));
      doubledDays = Math.min(safeDaysTaken, Math.max(0, diff));
    }
  }

  if (doubledDays > 0) {
    warnings.push(
      `Art. 137 CLT: ${doubledDays} dia(s) ultrapassam o prazo concessivo (${cycle?.concessiveLimit.split('-').reverse().join('/')}) e incidem pagamento em dobro.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    entitledDaysByAbsences,
    fractionNumber,
    endDate,
    noticeDueDate,
    paymentDueDate,
    doubledDays,
  };
}

/**
 * Estima a composição financeira completa das férias (férias + 1/3 + abono isento + dobra Art. 137 + descontos).
 */
export function estimateVacationFinancials(params: {
  baseSalary: number;
  daysTaken: number;
  soldDays: number;
  doubledDays: number;
  dependentsCount?: number;
  companyParams?: PayrollParameters;
}): VacationFinancialEstimate {
  const rules = getPayrollRules();
  const monthDays = rules.clt_defaults.commercial_month_days;
  const thirdRate =
    params.companyParams?.vacation_constitutional_third_rate ??
    rules.vacation_rules.constitutional_third_rate;

  const baseSalary = Math.max(0, Number(params.baseSalary) || 0);
  const dailySalary = baseSalary / monthDays;
  const daysTaken = Math.max(0, Math.floor(params.daysTaken || 0));
  const soldDays = Math.max(0, Math.floor(params.soldDays || 0));
  const doubledDays = Math.max(0, Math.floor(params.doubledDays || 0));

  const vacationBaseAmount = round2(dailySalary * daysTaken);
  const constitutionalThirdAmount = round2(vacationBaseAmount * thirdRate);
  const grossVacationAmount = round2(vacationBaseAmount + constitutionalThirdAmount);

  const abonoBaseAmount = round2(dailySalary * soldDays);
  const abonoThirdAmount = round2(abonoBaseAmount * thirdRate);
  const totalAbonoAmount = round2(abonoBaseAmount + abonoThirdAmount);

  const doubleAmount =
    doubledDays > 0 ? round2(dailySalary * doubledDays * (1 + thirdRate)) : 0;

  // Férias gozadas + 1/3 são tributáveis (INSS + IRRF); Abono pecuniário e Dobra Art. 137 são isentos
  const estimatedInss = calculateProgressiveINSS(grossVacationAmount);
  const estimatedIrrf = calculateIRRFBreakdown(
    grossVacationAmount,
    estimatedInss,
    params.dependentsCount ?? 0,
    params.companyParams?.apply_lei_15270
  ).irrfAmount;

  const totalGrossWithAbonoAndDouble = round2(
    grossVacationAmount + totalAbonoAmount + doubleAmount
  );
  const estimatedNetAmount = round2(
    Math.max(0, totalGrossWithAbonoAndDouble - estimatedInss - estimatedIrrf)
  );

  return {
    dailySalary: round2(dailySalary),
    vacationBaseAmount,
    constitutionalThirdAmount,
    grossVacationAmount,
    abonoBaseAmount,
    abonoThirdAmount,
    totalAbonoAmount,
    doubleAmount,
    estimatedInss,
    estimatedIrrf,
    totalGrossWithAbonoAndDouble,
    estimatedNetAmount,
  };
}
