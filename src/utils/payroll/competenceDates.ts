import { getPayrollRules } from './rulesLoader';

export interface CompetenceEligibilityResult {
  eligible: boolean;
  workedDays: number;
  isProportional: boolean;
  reason?: string;
}

/**
 * Calcula elegibilidade e dias trabalhados proporcionais na competência (YYYY-MM)
 * vinculados à data de contratação (hire_date) e eventual data de desligamento (resignation_date),
 * utilizando os dias comerciais configurados no YAML.
 */
export function calculateWorkedDaysForCompetence(
  competence: string,
  hireDate?: string | null,
  resignationDate?: string | null
): CompetenceEligibilityResult {
  const monthDays = getPayrollRules().clt_defaults.commercial_month_days;
  const compMatch = /^(\d{4})-(\d{2})$/.exec(competence.trim());
  if (!compMatch) {
    return { eligible: true, workedDays: monthDays, isProportional: false };
  }

  const compYm = `${compMatch[1]}-${compMatch[2]}`;
  let startDay = 1;
  let endDay = monthDays;
  let isProportional = false;
  const reasons: string[] = [];

  if (hireDate) {
    const hireMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(hireDate.trim());
    if (hireMatch) {
      const hireYm = `${hireMatch[1]}-${hireMatch[2]}`;
      const hireDay = Number(hireMatch[3]);
      if (hireYm > compYm) {
        return {
          eligible: false,
          workedDays: 0,
          isProportional: true,
          reason: `Admissão em ${hireMatch[3]}/${hireMatch[2]}/${hireMatch[1]} (posterior à competência ${competence})`,
        };
      }
      if (hireYm === compYm) {
        startDay = Math.min(Math.max(1, hireDay), monthDays);
        if (startDay > 1) {
          isProportional = true;
          reasons.push(`Proporcional à admissão em ${hireMatch[3]}/${hireMatch[2]}/${hireMatch[1]}`);
        }
      }
    }
  }

  if (resignationDate) {
    const resMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(resignationDate.trim());
    if (resMatch) {
      const resYm = `${resMatch[1]}-${resMatch[2]}`;
      const resDay = Number(resMatch[3]);
      if (resYm < compYm) {
        return {
          eligible: false,
          workedDays: 0,
          isProportional: true,
          reason: `Desligamento em ${resMatch[3]}/${resMatch[2]}/${resMatch[1]} (anterior à competência ${competence})`,
        };
      }
      if (resYm === compYm) {
        endDay = Math.min(Math.max(1, resDay), monthDays);
        if (endDay < monthDays) {
          isProportional = true;
          reasons.push(`Rescisão em ${resMatch[3]}/${resMatch[2]}/${resMatch[1]}`);
        }
      }
    }
  }

  const workedDays = Math.max(0, Math.min(monthDays, endDay - startDay + 1));
  if (workedDays === 0) {
    return {
      eligible: false,
      workedDays: 0,
      isProportional: true,
      reason: reasons.join(' · ') || 'Sem dias trabalhados na competência',
    };
  }

  return {
    eligible: true,
    workedDays,
    isProportional,
    reason: reasons.length > 0 ? reasons.join(' · ') : undefined,
  };
}
