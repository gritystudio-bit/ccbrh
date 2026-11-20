import { describe, expect, it } from 'vitest';
import {
  buildDefaultEsocialEmployerConfig,
  buildEsocialS1000Event,
  buildEsocialS1200Event,
  buildEsocialS1210Event,
  buildEsocialS1299Event,
  buildEsocialS2200Event,
  buildEsocialS2206Event,
  buildEsocialS2230Event,
  decomposePayrollEntryToS1200Items,
  generateEsocialEventId,
  validateEsocialEventId,
} from '../esocialS13Engine';
import { buildDefaultCompanyPayrollParameters } from '../../payrollCalculator';
import type { Company, Employee, Job, PayrollEntry } from '../../../types/database';

const mockCompany: Company = {
  id: 'comp-1',
  name: 'Empório Varanda Ltda',
  cnpj: '12345678000199',
  cnpj_root: '12345678',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

const mockEmployee: Employee = {
  id: 'eeb197c2-3bd5-49dc-ab4a-6240b1e08f7c',
  tenant_id: 'comp-1',
  full_name: 'José Pereira',
  email: 'jose.pereira@emporiovaranda.com.br',
  cpf: '12345678901',
  personal_info: { birth_date: '1991-04-12' },
  job_id: 'job-1',
  reports_to: null,
  status: 'active',
  hire_date: '2022-06-15',
  resignation_date: null,
  contract_type: 'clt',
  dependents_count: 2,
  vt_opted_in: true,
  vr_discount: 0,
  health_plan_discount: 120,
  created_at: '2022-06-15T00:00:00Z',
};

const mockJob: Job = {
  id: 'job-1',
  tenant_id: 'comp-1',
  title: 'Analista de Operações',
  department: 'Operações',
  base_salary: 3200,
  created_at: '2022-01-01T00:00:00Z',
};

const mockPayrollEntry: PayrollEntry = {
  id: 'entry-1',
  tenant_id: 'comp-1',
  employee_id: mockEmployee.id,
  competence: '2026-11',
  contract_type: 'clt',
  base_salary: 3200,
  worked_days: 30,
  dependents_count: 2,
  overtime_50_hours: 0,
  overtime_100_hours: 0,
  night_hours: 0,
  insalubrity_rate: 0,
  hazard_pay: false,
  bonuses: 0,
  absence_days: 0,
  vt_opted_in: true,
  vr_discount: 0,
  other_discounts: 120,
  overtime_amount: 0,
  dsr_amount: 0,
  night_shift_amount: 0,
  insalubrity_amount: 0,
  hazard_amount: 0,
  gross_salary: 3200,
  inss_amount: 272.6,
  irrf_amount: 0,
  vt_discount_amount: 192,
  absence_discount_amount: 0,
  total_discounts: 584.6,
  net_salary: 2615.4,
  fgts_amount: 256,
  inss_patronal_amount: 640,
  provision_13th: 266.67,
  provision_vacation: 355.56,
  status: 'draft',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('eSocial v. S-1.3 (NT 07/2026) Engine & Anexo II Validators', () => {
  const config = buildDefaultEsocialEmployerConfig('comp-1');
  const payrollParams = buildDefaultCompanyPayrollParameters('comp-1');

  it('gera Id de evento com exatos 36 caracteres conforme REGRA_VALIDA_ID_EVENTO', () => {
    const id = generateEsocialEventId({
      tpInsc: 1,
      nrInsc: '12345678',
      timestamp: new Date('2026-11-20T18:30:00Z'),
      sequence: 7,
    });
    expect(id.length).toBe(36);
    expect(validateEsocialEventId(id)).toBe(true);
    expect(id.startsWith('ID112345678000000')).toBe(true);
    expect(id.endsWith('00007')).toBe(true);
  });

  it('gera evento S-1000 do empregador no namespace v_S_01_03_00 sem erros de validação', () => {
    const draft = buildEsocialS1000Event({
      company: mockCompany,
      config,
      iniValid: '2026-01',
    });
    expect(draft.eventCode).toBe('S-1000');
    expect(draft.validationErrors).toHaveLength(0);
    expect(draft.xmlContent).toContain('evtInfoEmpregador/v_S_01_03_00');
    expect(draft.xmlContent).toContain('<classTrib>99</classTrib>');
  });

  it('gera evento S-2200 (Admissão CLT Cat. 101) e bloqueia envio indevido de prestador PJ B2B', () => {
    const cltDraft = buildEsocialS2200Event({
      company: mockCompany,
      config,
      employee: mockEmployee,
      job: mockJob,
    });
    expect(cltDraft.validationErrors).toHaveLength(0);
    expect(cltDraft.xmlContent).toContain('<codCateg>101</codCateg>');
    expect(cltDraft.xmlContent).toContain('<vrSalFx>3200.00</vrSalFx>');

    const pjDraft = buildEsocialS2200Event({
      company: mockCompany,
      config,
      employee: { ...mockEmployee, contract_type: 'pj' },
      job: mockJob,
    });
    expect(pjDraft.validationErrors.length).toBeGreaterThan(0);
    expect(pjDraft.validationErrors[0]).toContain('REGRA_COMPATIB_CATEG_EVENTO');
  });

  it('gera evento S-2206 (Alteração Salarial/Contratual) e S-2230 (Férias codMotAfast=15 com perAquis)', () => {
    const s2206 = buildEsocialS2206Event({
      company: mockCompany,
      config,
      employee: mockEmployee,
      job: mockJob,
      dtAlteracao: '2026-11-01',
      newSalary: 3650,
      description: 'Mérito anual',
    });
    expect(s2206.validationErrors).toHaveLength(0);
    expect(s2206.xmlContent).toContain('<vrSalFx>3650.00</vrSalFx>');

    const s2230 = buildEsocialS2230Event({
      company: mockCompany,
      config,
      employee: mockEmployee,
      codMotAfast: '15',
      dtIniAfast: '2026-11-10',
      dtTermAfast: '2026-11-29',
      perAquisStart: '2024-06-15',
      perAquisEnd: '2025-06-14',
    });
    expect(s2230.validationErrors).toHaveLength(0);
    expect(s2230.xmlContent).toContain('<codMotAfast>15</codMotAfast>');
    expect(s2230.xmlContent).toContain('<perAquis>');
  });

  it('decompõe folha em rubricas S-1200 (Tabela 03) e gera S-1210 (CR 056107 + S-5002 Lei 15.270) e S-1299', () => {
    const items = decomposePayrollEntryToS1200Items(mockPayrollEntry);
    expect(items.some((i) => i.codRubr === 'RUB-1000' && i.vrRubr === 3200 && i.natRubr === '1000')).toBe(true);
    expect(items.some((i) => i.codRubr === 'RUB-9201' && i.vrRubr === 272.6 && i.codIncCP === '31')).toBe(true);
    expect(items.some((i) => i.codRubr === 'RUB-9216' && i.vrRubr === 192 && i.natRubr === '9216')).toBe(true);
    expect(items.some((i) => i.codRubr === 'RUB-9219' && i.vrRubr === 120 && i.codIncIRRF === '67')).toBe(true);

    const payslipItems = decomposePayrollEntryToS1200Items(mockPayrollEntry, 'TABRUB-CCB-S13', {
      includeZeroIrrf: true,
    });
    const zeroIrrfLine = payslipItems.find((i) => i.codRubr === 'RUB-9203');
    expect(zeroIrrfLine).toBeDefined();
    expect(zeroIrrfLine?.vrRubr).toBe(0);
    expect(zeroIrrfLine?.refLabel).toBe('Isento L15.270');

    const s1200 = buildEsocialS1200Event({
      company: mockCompany,
      config,
      employee: mockEmployee,
      entry: mockPayrollEntry,
    });
    expect(s1200.validationErrors).toHaveLength(0);
    expect(s1200.returnTotals?.s5001_inss_segurado).toBe(272.6);
    expect(s1200.returnTotals?.s5003_fgts_mensal).toBe(256);

    const s1210 = buildEsocialS1210Event({
      company: mockCompany,
      config,
      employee: mockEmployee,
      entry: mockPayrollEntry,
      payrollParameters: payrollParams,
    });
    expect(s1210.validationErrors).toHaveLength(0);
    expect(s1210.xmlContent).toContain('<tpCR>056107</tpCR>');
    expect(s1210.xmlContent).toContain('<planSaude>');
    expect(s1210.returnTotals?.s5002_irrf_retido).toBe(0);
    expect(s1210.returnTotals?.s5002_lei15270_isento).toBe(true);

    const s1299 = buildEsocialS1299Event({
      company: mockCompany,
      config,
      competence: '2026-11',
      entriesForCompetence: [mockPayrollEntry],
      activeCltEmployeesCount: 1,
      s1200Count: 1,
      s1210Count: 1,
    });
    expect(s1299.validationErrors).toHaveLength(0);
    expect(s1299.returnTotals?.s5013_fgts_digital_total).toBe(256);
  });
});
