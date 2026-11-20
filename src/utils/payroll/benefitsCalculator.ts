import type {
  EmployeeBenefitDiscountMode,
  EmployeeBenefitRecord,
  EmployeeBenefitType,
  PayrollParameters,
} from '../../types/database';
import { round2 } from './cltCalculator';
import { getPayrollRules } from './rulesLoader';

export interface BenefitCatalogMeta {
  type: EmployeeBenefitType;
  label: string;
  category: 'mobilidade' | 'alimentacao' | 'saude' | 'familia' | 'previdencia' | 'trabalho';
  legalBasis: string;
  nonSalaryNature: boolean;
  defaultDiscountMode: EmployeeBenefitDiscountMode;
  defaultDiscountValue: number;
  description: string;
}

export const BENEFIT_TYPE_CATALOG: Record<EmployeeBenefitType, BenefitCatalogMeta> = {
  vale_transporte: {
    type: 'vale_transporte',
    label: 'Vale-Transporte (VT)',
    category: 'mobilidade',
    legalBasis: 'Lei nº 7.418/1985 (teto de 6% limitado ao custo efetivo)',
    nonSalaryNature: true,
    defaultDiscountMode: 'percent_salary',
    defaultDiscountValue: 6,
    description: 'Desconto limitado ao menor valor entre 6% do salário-base e o custo total das passagens.',
  },
  vale_refeicao: {
    type: 'vale_refeicao',
    label: 'Vale-Refeição (VR)',
    category: 'alimentacao',
    legalBasis: 'PAT · Lei nº 6.321/1976, Decreto nº 10.854/2021 e Lei nº 14.442/2022',
    nonSalaryNature: true,
    defaultDiscountMode: 'percent_benefit',
    defaultDiscountValue: 20,
    description: 'Vedado pagamento em dinheiro (Art. 457 §2º CLT). Desconto no PAT limitado a 20% do valor.',
  },
  vale_alimentacao: {
    type: 'vale_alimentacao',
    label: 'Vale-Alimentação (VA)',
    category: 'alimentacao',
    legalBasis: 'PAT · Lei nº 6.321/1976, Decreto nº 10.854/2021 e Lei nº 14.442/2022',
    nonSalaryNature: true,
    defaultDiscountMode: 'percent_benefit',
    defaultDiscountValue: 20,
    description: 'Auxílio-alimentação em cartão/PAT não integra o salário nem sofre encargos de INSS/FGTS.',
  },
  plano_saude: {
    type: 'plano_saude',
    label: 'Plano de Saúde (Assistência Médica)',
    category: 'saude',
    legalBasis: 'Art. 458 §2º IV e §5º CLT + Lei nº 8.212/1991 Art. 28 §9º "q"',
    nonSalaryNature: true,
    defaultDiscountMode: 'fixed',
    defaultDiscountValue: 0,
    description: 'Assistência médica e coparticipações não integram a remuneração para fins trabalhistas.',
  },
  plano_odontologico: {
    type: 'plano_odontologico',
    label: 'Plano Odontológico',
    category: 'saude',
    legalBasis: 'Art. 458 §2º IV e §5º CLT',
    nonSalaryNature: true,
    defaultDiscountMode: 'fixed',
    defaultDiscountValue: 0,
    description: 'Cobertura odontológica empresarial e de dependentes isenta de encargos sociais.',
  },
  auxilio_creche: {
    type: 'auxilio_creche',
    label: 'Auxílio-Creche / Reembolso-Creche',
    category: 'familia',
    legalBasis: 'Art. 389 §1º CLT + Lei nº 14.457/2022 + Portaria MTP 671/2021',
    nonSalaryNature: true,
    defaultDiscountMode: 'none',
    defaultDiscountValue: 0,
    description: 'Reembolso para filhos até 5 anos e 11 meses (isento de INSS, FGTS e IRRF).',
  },
  auxilio_home_office: {
    type: 'auxilio_home_office',
    label: 'Ajuda de Custo Teletrabalho (Home Office)',
    category: 'trabalho',
    legalBasis: 'Art. 75-D e Art. 457 §2º CLT (Lei nº 13.467/2017)',
    nonSalaryNature: true,
    defaultDiscountMode: 'none',
    defaultDiscountValue: 0,
    description: 'Custeio de infraestrutura/energia/internet no teletrabalho sem natureza salarial.',
  },
  seguro_vida: {
    type: 'seguro_vida',
    label: 'Seguro de Vida e Acidentes Pessoais',
    category: 'saude',
    legalBasis: 'Art. 458 §2º V CLT',
    nonSalaryNature: true,
    defaultDiscountMode: 'none',
    defaultDiscountValue: 0,
    description: 'Proteção securitária sem integração salarial.',
  },
  previdencia_privada: {
    type: 'previdencia_privada',
    label: 'Previdência Privada Complementar',
    category: 'previdencia',
    legalBasis: 'Art. 458 §2º VI CLT',
    nonSalaryNature: true,
    defaultDiscountMode: 'fixed',
    defaultDiscountValue: 0,
    description: 'Aporte empresarial e contribuição opcional descontada em folha.',
  },
  vale_cultura: {
    type: 'vale_cultura',
    label: 'Vale-Cultura',
    category: 'familia',
    legalBasis: 'Art. 458 §2º VIII CLT + Lei nº 12.761/2012',
    nonSalaryNature: true,
    defaultDiscountMode: 'none',
    defaultDiscountValue: 0,
    description: 'Programa de Cultura do Trabalhador com natureza indenizatória.',
  },
  auxilio_educacao: {
    type: 'auxilio_educacao',
    label: 'Auxílio-Educação / Bolsas',
    category: 'familia',
    legalBasis: 'Art. 458 §2º II CLT',
    nonSalaryNature: true,
    defaultDiscountMode: 'none',
    defaultDiscountValue: 0,
    description: 'Matrícula, mensalidade, livros e material didático sem incidência salarial.',
  },
  outros: {
    type: 'outros',
    label: 'Outro Benefício / Convênio',
    category: 'trabalho',
    legalBasis: 'Art. 457 §2º / Art. 458 CLT',
    nonSalaryNature: true,
    defaultDiscountMode: 'fixed',
    defaultDiscountValue: 0,
    description: 'Benefício corporativo complementar ou convênio cadastrado pelo RH.',
  },
};

export interface SingleBenefitMonthlyImpact {
  employerCost: number;
  employeeDiscount: number;
  coparticipation: number;
  totalEmployeeDeduction: number;
  complianceWarnings: string[];
}

export interface EmployeeBenefitsSummary {
  activeCount: number;
  totalEmployerCost: number;
  totalEmployeeDiscount: number;
  vtOptedIn: boolean;
  vtEmployerValue: number;
  vtDiscount: number;
  vrVaDiscount: number;
  healthAndOtherDiscounts: number;
  complianceWarnings: string[];
}

export function calculateSingleBenefitMonthlyImpact(
  benefit: Pick<
    EmployeeBenefitRecord,
    | 'benefit_type'
    | 'monthly_employer_value'
    | 'employee_discount_mode'
    | 'employee_discount_value'
    | 'coparticipation_value'
    | 'include_in_payroll'
    | 'status'
  >,
  baseSalary: number,
  companyParams?: PayrollParameters
): SingleBenefitMonthlyImpact {
  const rules = getPayrollRules();
  const warnings: string[] = [];

  if (benefit.status !== 'active') {
    return {
      employerCost: 0,
      employeeDiscount: 0,
      coparticipation: 0,
      totalEmployeeDeduction: 0,
      complianceWarnings: [],
    };
  }

  const employerCost = round2(Math.max(0, Number(benefit.monthly_employer_value || 0)));
  const coparticipation = round2(Math.max(0, Number(benefit.coparticipation_value || 0)));
  const rawDiscVal = Math.max(0, Number(benefit.employee_discount_value || 0));

  let employeeDiscount = 0;
  if (benefit.include_in_payroll) {
    if (benefit.employee_discount_mode === 'fixed') {
      employeeDiscount = round2(rawDiscVal);
    } else if (benefit.employee_discount_mode === 'percent_salary') {
      const calculated = round2(Math.max(0, baseSalary) * (rawDiscVal / 100));
      if (benefit.benefit_type === 'vale_transporte' && employerCost > 0) {
        employeeDiscount = round2(Math.min(calculated, employerCost));
      } else {
        employeeDiscount = calculated;
      }
    } else if (benefit.employee_discount_mode === 'percent_benefit') {
      employeeDiscount = round2(employerCost * (rawDiscVal / 100));
    }
  }

  // Checagens de conformidade trabalhista (VT e PAT)
  if (benefit.benefit_type === 'vale_transporte') {
    const vtCapPct =
      (companyParams?.vt_discount_cap_rate ?? rules.clt_defaults.vt_discount_cap_rate) * 100;
    if (
      benefit.employee_discount_mode === 'percent_salary' &&
      rawDiscVal > vtCapPct
    ) {
      warnings.push(
        `Vale-Transporte (Lei nº 7.418/85): desconto configurado (${rawDiscVal}%) excede o teto legal de ${vtCapPct.toFixed(0)}% do salário-base.`
      );
    }
  }

  if (benefit.benefit_type === 'vale_refeicao' || benefit.benefit_type === 'vale_alimentacao') {
    const patCapRate = rules.benefit_rules.pat_employee_discount_cap_rate;
    const patMaxDiscount = round2(employerCost * patCapRate);
    if (employerCost > 0 && employeeDiscount > patMaxDiscount + 0.01) {
      warnings.push(
        `${BENEFIT_TYPE_CATALOG[benefit.benefit_type].label} (Decreto nº 10.854/2021 - PAT): desconto de R$ ${employeeDiscount.toFixed(2)} ultrapassa 20% do benefício (R$ ${patMaxDiscount.toFixed(2)}).`
      );
    }
  }

  const totalEmployeeDeduction = round2(employeeDiscount + coparticipation);

  return {
    employerCost,
    employeeDiscount,
    coparticipation,
    totalEmployeeDeduction,
    complianceWarnings: warnings,
  };
}

export function summarizeEmployeeBenefits(
  benefits: EmployeeBenefitRecord[],
  baseSalary: number,
  companyParams?: PayrollParameters
): EmployeeBenefitsSummary {
  const activeBenefits = benefits.filter((b) => b.status === 'active');

  let totalEmployerCost = 0;
  let totalEmployeeDiscount = 0;
  let vtOptedIn = false;
  let vtEmployerValue = 0;
  let vtDiscount = 0;
  let vrVaDiscount = 0;
  let healthAndOtherDiscounts = 0;
  const complianceWarnings: string[] = [];

  for (const benefit of activeBenefits) {
    const impact = calculateSingleBenefitMonthlyImpact(benefit, baseSalary, companyParams);
    totalEmployerCost = round2(totalEmployerCost + impact.employerCost);
    totalEmployeeDiscount = round2(totalEmployeeDiscount + impact.totalEmployeeDeduction);
    complianceWarnings.push(...impact.complianceWarnings);

    if (benefit.benefit_type === 'vale_transporte') {
      if (benefit.include_in_payroll) {
        vtOptedIn = true;
      }
      vtEmployerValue = round2(vtEmployerValue + impact.employerCost);
      vtDiscount = round2(vtDiscount + impact.totalEmployeeDeduction);
    } else if (
      benefit.benefit_type === 'vale_refeicao' ||
      benefit.benefit_type === 'vale_alimentacao'
    ) {
      vrVaDiscount = round2(vrVaDiscount + impact.totalEmployeeDeduction);
    } else {
      healthAndOtherDiscounts = round2(healthAndOtherDiscounts + impact.totalEmployeeDeduction);
    }
  }

  return {
    activeCount: activeBenefits.length,
    totalEmployerCost,
    totalEmployeeDiscount,
    vtOptedIn,
    vtEmployerValue,
    vtDiscount,
    vrVaDiscount,
    healthAndOtherDiscounts,
    complianceWarnings,
  };
}
