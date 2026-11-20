import type {
  Employee,
  EmployeeVacationRecord,
  PayrollEntry,
} from '../../types/database';

export type VacationCycleStatus =
  | 'settled'         // Já gozada / quitada anteriormente
  | 'expired_double'  // Período concessivo expirado -> Pagamento em Dobro (Art. 137 CLT)
  | 'open_concessive' // Adquirida e dentro do período concessivo (Art. 134 CLT)
  | 'acquiring';      // Período aquisitivo ainda em curso (proporcional N/12)

export interface VacationCyclePeriod {
  index: number;
  label: string; // Ex: "2024/2025"
  acquisitiveStart: string; // YYYY-MM-DD
  acquisitiveEnd: string;   // YYYY-MM-DD
  concessiveLimit: string;  // YYYY-MM-DD
  status: VacationCycleStatus;
  entitledDays: number;
  takenDays: number;
  soldDays: number;
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
  totalTakenDays: number;
  totalSoldDays: number;
  recommendedCycle: VacationCyclePeriod | null;
}

const ACTIVE_VACATION_STATUSES = new Set([
  'approved',
  'scheduled',
  'in_progress',
  'completed',
]);

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
 * do colaborador na competência informada, consolidando registros formais de
 * `employee_vacations` e lançamentos da `payroll_entries` sem dupla contagem.
 */
export function analyzeEmployeeVacationCycles(params: {
  employee?: Employee;
  competence: string;
  entitledDaysPerCycle?: number;
  existingEntries?: PayrollEntry[];
  vacationRecords?: EmployeeVacationRecord[];
  excludeCompetence?: string;
}): EmployeeVacationSummary {
  const {
    employee,
    competence,
    entitledDaysPerCycle = 30,
    existingEntries = [],
    vacationRecords = [],
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
      totalTakenDays: 0,
      totalSoldDays: 0,
      recommendedCycle: null,
    };
  }

  const hireDate = employee.hire_date.slice(0, 10);
  const refDate = getCompetenceEndDate(competence);

  // Registros formais do submódulo Férias ativos para este colaborador
  const activeVacationRecords = vacationRecords.filter(
    (v) => v.employee_id === employee.id && ACTIVE_VACATION_STATUSES.has(v.status)
  );

  const coveredEntryIds = new Set(
    activeVacationRecords.map((v) => v.payroll_entry_id).filter((id): id is string => Boolean(id))
  );
  const coveredCompetences = new Set(
    activeVacationRecords
      .map((v) => v.competence || v.start_date.slice(0, 7))
      .filter((c): c is string => Boolean(c))
  );

  // Separa dias de férias vinculados explicitamente a um rótulo de ciclo vs. avulsos
  const recordsByLabel = new Map<string, { taken: number; sold: number }>();
  let unlinkedTakenFromRecords = 0;
  let unlinkedSoldFromRecords = 0;

  for (const rec of activeVacationRecords) {
    const label = (rec.acquisitive_period_label || '').trim();
    const recTaken = Number(rec.days_taken || 0);
    const recSold = Number(rec.sold_days || 0);
    if (label) {
      const current = recordsByLabel.get(label) || { taken: 0, sold: 0 };
      current.taken += recTaken;
      current.sold += recSold;
      recordsByLabel.set(label, current);
    } else {
      unlinkedTakenFromRecords += recTaken;
      unlinkedSoldFromRecords += recSold;
    }
  }

  // Soma de dias de férias lançados diretamente na folha (excluindo os já cobertos por employee_vacations)
  const unlinkedEntries = existingEntries.filter(
    (e) =>
      e.employee_id === employee.id &&
      (!excludeCompetence || e.competence !== excludeCompetence) &&
      !coveredEntryIds.has(e.id) &&
      !coveredCompetences.has(e.competence) &&
      (Number(e.vacation_days || 0) > 0 || Number(e.vacation_sold_days || 0) > 0)
  );

  const entriesByLabel = new Map<string, { taken: number; sold: number }>();
  let unlinkedTakenFromPayroll = 0;
  let unlinkedSoldFromPayroll = 0;

  for (const entry of unlinkedEntries) {
    const rawLabel = (entry.vacation_period_label || '').trim();
    const matchedCycleLabel = rawLabel.match(/^(\d{4}(?:\/\d{4})?)/)?.[1] || '';
    const entryTaken = Number(entry.vacation_days || 0);
    const entrySold = Number(entry.vacation_sold_days || 0);
    if (matchedCycleLabel) {
      const current = entriesByLabel.get(matchedCycleLabel) || { taken: 0, sold: 0 };
      current.taken += entryTaken;
      current.sold += entrySold;
      entriesByLabel.set(matchedCycleLabel, current);
    } else {
      unlinkedTakenFromPayroll += entryTaken;
      unlinkedSoldFromPayroll += entrySold;
    }
  }

  // Se last_vacation_settled_until não foi preenchido, assumimos por padrão que ciclos
  // encerrados há mais de 24 meses já foram gozados no passado (exceto quando configurado explicitamente).
  const defaultSettledCutoff = addYearsIso(refDate, -2);
  const settledUntil = employee.last_vacation_settled_until
    ? employee.last_vacation_settled_until.slice(0, 10)
    : defaultSettledCutoff;

  const cycles: VacationCyclePeriod[] = [];
  let remainingUnlinkedTaken = unlinkedTakenFromRecords + unlinkedTakenFromPayroll;
  let remainingUnlinkedSold = unlinkedSoldFromRecords + unlinkedSoldFromPayroll;

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

      const directRec = recordsByLabel.get(label);
      const directEntry = entriesByLabel.get(label);
      const takenDays = (directRec?.taken || 0) + (directEntry?.taken || 0);
      const soldDays = (directRec?.sold || 0) + (directEntry?.sold || 0);
      const proportionalRight = Math.round((entitledDaysPerCycle / 12) * avos);

      cycles.push({
        index: i + 1,
        label,
        acquisitiveStart: acqStart,
        acquisitiveEnd: acqEnd,
        concessiveLimit: concLimit,
        status: 'acquiring',
        entitledDays: entitledDaysPerCycle,
        takenDays,
        soldDays,
        remainingDays: Math.max(0, proportionalRight - takenDays - soldDays),
        isDoubledArt137: false,
        proportionalMonths: avos,
      });
      break;
    }

    // Ciclo já adquirido (12 meses completos)
    const isSettledByDate = acqEnd <= settledUntil;
    let takenInCycle = isSettledByDate ? entitledDaysPerCycle : 0;
    let soldInCycle = 0;

    if (!isSettledByDate) {
      const directRec = recordsByLabel.get(label);
      const directEntry = entriesByLabel.get(label);

      if (directRec) {
        const takeCap = Math.min(entitledDaysPerCycle - takenInCycle - soldInCycle, directRec.taken);
        takenInCycle += Math.max(0, takeCap);
        const soldCap = Math.min(entitledDaysPerCycle - takenInCycle - soldInCycle, directRec.sold);
        soldInCycle += Math.max(0, soldCap);
      }
      if (directEntry) {
        const takeCap = Math.min(entitledDaysPerCycle - takenInCycle - soldInCycle, directEntry.taken);
        takenInCycle += Math.max(0, takeCap);
        const soldCap = Math.min(entitledDaysPerCycle - takenInCycle - soldInCycle, directEntry.sold);
        soldInCycle += Math.max(0, soldCap);
      }

      const spaceLeftAfterDirect = Math.max(0, entitledDaysPerCycle - takenInCycle - soldInCycle);
      if (spaceLeftAfterDirect > 0 && remainingUnlinkedTaken > 0) {
        const consumeTaken = Math.min(spaceLeftAfterDirect, remainingUnlinkedTaken);
        takenInCycle += consumeTaken;
        remainingUnlinkedTaken -= consumeTaken;
      }

      const spaceLeftAfterTaken = Math.max(0, entitledDaysPerCycle - takenInCycle - soldInCycle);
      if (spaceLeftAfterTaken > 0 && remainingUnlinkedSold > 0) {
        const consumeSold = Math.min(spaceLeftAfterTaken, remainingUnlinkedSold);
        soldInCycle += consumeSold;
        remainingUnlinkedSold -= consumeSold;
      }
    }

    const totalConsumed = takenInCycle + soldInCycle;
    const remainingDays = Math.max(0, entitledDaysPerCycle - totalConsumed);
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
      soldDays: soldInCycle,
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
  const totalTakenDays = cycles.reduce((acc, c) => acc + c.takenDays, 0);
  const totalSoldDays = cycles.reduce((acc, c) => acc + c.soldDays, 0);

  return {
    cycles,
    openCycles,
    expiredCycles,
    concessiveCycles,
    acquiringCycle,
    totalOpenPeriodsCount: openCycles.length,
    totalOpenDays,
    totalExpiredDays,
    totalTakenDays,
    totalSoldDays,
    recommendedCycle: openCycles[0] || acquiringCycle || null,
  };
}
