import type { Employee, PayrollEntry } from '../../types/database';

export type VacationCycleStatus =
  | 'settled'       // Já gozada / quitada anteriormente
  | 'expired_double' // Período concessivo expirado -> Pagamento em Dobro (Art. 137 CLT)
  | 'open_concessive' // Adquirida e dentro do período concessivo (Art. 134 CLT)
  | 'acquiring';     // Período aquisitivo ainda em curso (proporcional N/12)

export interface VacationCyclePeriod {
  index: number;
  label: string; // Ex: "2024/2025"
  acquisitiveStart: string; // YYYY-MM-DD
  acquisitiveEnd: string;   // YYYY-MM-DD
  concessiveLimit: string;  // YYYY-MM-DD
  status: VacationCycleStatus;
  entitledDays: number;
  takenDays: number;
  remainingDays: number;
  isDoubledArt137: boolean;
  proportionalMonths?: number;
}

export interface EmployeeVacationSummary {
  cycles: VacationCyclePeriod[];
  openCycles: VacationCyclePeriod[]; // expired_double + open_concessive
  expiredCycles: VacationCyclePeriod[];
  concessiveCycles: VacationCyclePeriod[];
  acquiringCycle: VacationCyclePeriod | null;
  totalOpenPeriodsCount: number;
  totalOpenDays: number;
  totalExpiredDays: number;
  recommendedCycle: VacationCyclePeriod | null;
}

function addYearsIso(isoDate: string, years: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  const year = Number(m[1]) + years;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatIsoDateBR(iso?: string | null): string {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function getCompetenceEndDate(competence: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(competence);
  if (!m) return '2026-12-31';
  const year = Number(m[1]);
  const month = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Calcula todos os Períodos Aquisitivos (Art. 130 CLT) e Concessivos (Art. 134 CLT)
 * do colaborador na competência informada, identificando se há férias acumuladas
 * e/ou vencidas com pagamento em dobro (Art. 137 CLT).
 */
export function analyzeEmployeeVacationCycles(params: {
  employee?: Employee;
  competence: string;
  entitledDaysPerCycle?: number;
  existingEntries?: PayrollEntry[];
  excludeCompetence?: string;
}): EmployeeVacationSummary {
  const {
    employee,
    competence,
    entitledDaysPerCycle = 30,
    existingEntries = [],
    excludeCompetence,
  } = params;

  if (!employee || !employee.hire_date || employee.contract_type === 'pj') {
    return {
      cycles: [],
      openCycles: [],
      expiredCycles: [],
      concessiveCycles: [],
      acquiringCycle: null,
      totalOpenPeriodsCount: 0,
      totalOpenDays: 0,
      totalExpiredDays: 0,
      recommendedCycle: null,
    };
  }

  const hireDate = employee.hire_date.slice(0, 10);
  const refDate = getCompetenceEndDate(competence);

  // Soma de dias de férias já gozados + vendidos em outras competências no sistema
  const totalLoggedVacationDays = existingEntries
    .filter(
      (e) =>
        e.employee_id === employee.id &&
        (!excludeCompetence || e.competence !== excludeCompetence)
    )
    .reduce(
      (acc, e) => acc + Number(e.vacation_days || 0) + Number(e.vacation_sold_days || 0),
      0
    );

  // Se last_vacation_settled_until não foi preenchido, assumimos por padrão que ciclos
  // encerrados há mais de 24 meses já foram gozados no passado (exceto quando configurado explicitamente).
  const defaultSettledCutoff = addYearsIso(refDate, -2);
  const settledUntil = employee.last_vacation_settled_until
    ? employee.last_vacation_settled_until.slice(0, 10)
    : defaultSettledCutoff;

  const cycles: VacationCyclePeriod[] = [];
  let remainingLoggedToConsume = totalLoggedVacationDays;

  for (let i = 0; i < 25; i++) {
    const acqStart = addYearsIso(hireDate, i);
    if (acqStart > refDate) break;

    const nextStart = addYearsIso(hireDate, i + 1);
    const acqEnd = addDaysIso(nextStart, -1);
    const concLimit = addDaysIso(addYearsIso(hireDate, i + 2), -1);
    const startYear = acqStart.slice(0, 4);
    const endYear = acqEnd.slice(0, 4);
    const label = startYear === endYear ? startYear : `${startYear}/${endYear}`;

    // Verifica se o ciclo ainda está em fase de aquisição na data da competência
    if (acqEnd > refDate) {
      const startMs = Date.parse(`${acqStart}T00:00:00Z`);
      const refMs = Date.parse(`${refDate}T00:00:00Z`);
      const diffDays = Math.max(0, Math.floor((refMs - startMs) / (1000 * 60 * 60 * 24)));
      const avos = Math.min(12, Math.max(1, Math.round(diffDays / 30)));

      cycles.push({
        index: i + 1,
        label,
        acquisitiveStart: acqStart,
        acquisitiveEnd: acqEnd,
        concessiveLimit: concLimit,
        status: 'acquiring',
        entitledDays: entitledDaysPerCycle,
        takenDays: 0,
        remainingDays: Math.round((entitledDaysPerCycle / 12) * avos),
        isDoubledArt137: false,
        proportionalMonths: avos,
      });
      break;
    }

    // Ciclo já adquirido (12 meses completos)
    const isSettledByDate = acqEnd <= settledUntil;
    let takenInCycle = isSettledByDate ? entitledDaysPerCycle : 0;

    if (!isSettledByDate && remainingLoggedToConsume > 0) {
      const consume = Math.min(entitledDaysPerCycle, remainingLoggedToConsume);
      takenInCycle += consume;
      remainingLoggedToConsume -= consume;
    }

    const remainingDays = Math.max(0, entitledDaysPerCycle - takenInCycle);
    const isExpired = remainingDays > 0 && refDate > concLimit;

    const status: VacationCycleStatus =
      remainingDays === 0
        ? 'settled'
        : isExpired
        ? 'expired_double'
        : 'open_concessive';

    cycles.push({
      index: i + 1,
      label,
      acquisitiveStart: acqStart,
      acquisitiveEnd: acqEnd,
      concessiveLimit: concLimit,
      status,
      entitledDays: entitledDaysPerCycle,
      takenDays: takenInCycle,
      remainingDays,
      isDoubledArt137: status === 'expired_double',
    });
  }

  const expiredCycles = cycles.filter((c) => c.status === 'expired_double');
  const concessiveCycles = cycles.filter((c) => c.status === 'open_concessive');
  const openCycles = [...expiredCycles, ...concessiveCycles];
  const acquiringCycle = cycles.find((c) => c.status === 'acquiring') || null;

  const totalOpenDays = openCycles.reduce((acc, c) => acc + c.remainingDays, 0);
  const totalExpiredDays = expiredCycles.reduce((acc, c) => acc + c.remainingDays, 0);

  return {
    cycles,
    openCycles,
    expiredCycles,
    concessiveCycles,
    acquiringCycle,
    totalOpenPeriodsCount: openCycles.length,
    totalOpenDays,
    totalExpiredDays,
    recommendedCycle: openCycles[0] || acquiringCycle || null,
  };
}
