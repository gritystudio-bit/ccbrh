import { describe, expect, it } from 'vitest';
import {
  buildDefaultReinfContributorConfig,
  buildReinfR1000Event,
  buildReinfR2010Event,
  buildReinfR2099Event,
  buildReinfR4010Event,
  buildReinfR4020FromPjPayrollEntry,
  buildReinfR4040Event,
  buildReinfR4099Event,
  buildReinfR9000Event,
  generateReinfEventId,
  splitPjRetentionBreakdown,
  validateReinfEventId,
} from '../reinfEngine';
import type { Company, Employee, PayrollEntry, ReinfEventRecord } from '../../../types/database';

const mockCompany: Company = {
  id: 'comp-1',
  name: 'CCB Consultoria & RH Ltda',
  cnpj: '12345678000199',
  cnpj_root: '12345678',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
};

const mockPjEmployee: Employee = {
  id: 'emp-pj-1',
  tenant_id: 'comp-1',
  full_name: 'Carlos Consultor PJ',
  email: 'carlos@consultoria.com.br',
  cpf: '99988877766',
  job_id: 'job-1',
  reports_to: null,
  status: 'active',
  hire_date: '2025-02-01',
  resignation_date: null,
  contract_type: 'pj',
  pj_company_name: 'Carlos Consultoria Empresarial Ltda',
  pj_cnpj: '44555666000177',
  dependents_count: 0,
  vt_opted_in: false,
  vr_discount: 0,
  health_plan_discount: 0,
  created_at: '2025-02-01T00:00:00Z',
};

const mockPjEntry: PayrollEntry = {
  id: 'entry-pj-1',
  tenant_id: 'comp-1',
  employee_id: mockPjEmployee.id,
  competence: '2026-11',
  contract_type: 'pj',
  base_salary: 10000,
  worked_days: 30,
  dependents_count: 0,
  overtime_50_hours: 0,
  overtime_100_hours: 0,
  night_hours: 0,
  insalubrity_rate: 0,
  hazard_pay: false,
  bonuses: 0,
  absence_days: 0,
  vt_opted_in: false,
  vr_discount: 0,
  other_discounts: 0,
  overtime_amount: 0,
  dsr_amount: 0,
  night_shift_amount: 0,
  insalubrity_amount: 0,
  hazard_amount: 0,
  gross_salary: 10000,
  inss_amount: 0,
  irrf_amount: 0,
  vt_discount_amount: 0,
  absence_discount_amount: 0,
  total_discounts: 615,
  net_salary: 9385,
  fgts_amount: 0,
  inss_patronal_amount: 0,
  provision_13th: 0,
  provision_vacation: 0,
  nfse_number: 'NF-2026-088',
  nfse_issued_at: '2026-11-18T10:00:00Z',
  pj_iss_amount: 0,
  pj_retention_amount: 615,
  status: 'closed',
  created_at: '2026-11-18T10:00:00Z',
  updated_at: '2026-11-18T10:00:00Z',
};

describe('EFD-Reinf v2.1.2b Engine & Anexo II Validators', () => {
  const config = {
    ...buildDefaultReinfContributorConfig('comp-1'),
    contato_cpf: '12345678901',
    resp_cpf: '12345678901',
  };

  it('gera Id com exatos 36 caracteres conforme REGRA_VALIDA_ID_EVENTO', () => {
    const id = generateReinfEventId({
      tpInsc: 1,
      nrInsc: '12345678',
      timestamp: new Date('2026-11-20T19:20:00Z'),
      sequence: 14,
    });
    expect(id.length).toBe(36);
    expect(validateReinfEventId(id)).toBe(true);
    expect(id.startsWith('ID112345678000000')).toBe(true);
  });

  it('gera evento R-1000 com classTrib, ECD e namespace v2_01_02', () => {
    const draft = buildReinfR1000Event({
      company: mockCompany,
      config,
      iniValid: '2026-01',
    });
    expect(draft.eventCode).toBe('R-1000');
    expect(draft.validationErrors).toHaveLength(0);
    expect(draft.xmlContent).toContain('evtInfoContribuinte/v2_01_02');
    expect(draft.xmlContent).toContain('<classTrib>99</classTrib>');
  });

  it('decompõe retenção PJ (1,5% IRRF + 4,65% PCC) e gera R-4020 direto da Folha PJ', () => {
    const split = splitPjRetentionBreakdown(10000, 615);
    expect(split.vlrIR).toBe(150);
    expect(split.vlrCSLL).toBe(100);
    expect(split.vlrCofins).toBe(300);
    expect(split.vlrPP).toBe(65);

    const draft = buildReinfR4020FromPjPayrollEntry({
      company: mockCompany,
      config,
      employee: mockPjEmployee,
      entry: mockPjEntry,
    });
    expect(draft.validationErrors).toHaveLength(0);
    expect(draft.xmlContent).toContain('<cnpjBenef>44555666000177</cnpjBenef>');
    expect(draft.xmlContent).toContain('<natRend>15014</natRend>');
    expect(draft.returnTotals?.r9015_dctfweb_ret).toBe(615);
  });

  it('gera R-4010 (PF), R-2010 (INSS 11%/3,5%) e R-4040 (vlrLiq / 0,65)', () => {
    const r4010 = buildReinfR4010Event({
      company: mockCompany,
      config,
      input: {
        competence: '2026-11',
        cpfBenef: '11122233344',
        nomeBenef: 'Sócio Administrador',
        natRend: '12001',
        dtFG: '2026-11-20',
        vlrRendBruto: 25000,
        vlrRendTrib: 0,
        vlrIR: 0,
      },
    });
    expect(r4010.validationErrors).toHaveLength(0);
    expect(r4010.xmlContent).toContain('<tpIsencao>5</tpIsencao>');

    const r2010 = buildReinfR2010Event({
      company: mockCompany,
      config,
      input: {
        competence: '2026-11',
        cnpjPrestador: '55666777000188',
        nomePrestador: 'Empresa Limpeza Ltda',
        numDocto: 'NF-900',
        dtEmissaoNF: '2026-11-15',
        vlrBruto: 8000,
        vlrBaseRet: 8000,
        indCPRB: 0,
        tpServico: '100000001',
      },
    });
    expect(r2010.validationErrors).toHaveLength(0);
    expect(r2010.returnTotals?.r9001_ret_cp).toBe(880);

    const r4040 = buildReinfR4040Event({
      company: mockCompany,
      config,
      input: {
        competence: '2026-11',
        natRend: '19001',
        dtFG: '2026-11-20',
        vlrLiq: 650,
        descr: 'Brinde não identificado',
      },
    });
    expect(r4040.returnTotals?.r9005_base_ir).toBe(1000);
    expect(r4040.returnTotals?.r9005_vlr_ir).toBe(350);
  });

  it('consolida fechamentos R-4099 (R-9015), R-2099 (R-9011) e exclusão R-9000', () => {
    const r4020Draft = buildReinfR4020FromPjPayrollEntry({
      company: mockCompany,
      config,
      employee: mockPjEmployee,
      entry: mockPjEntry,
    });
    const storedR4020: ReinfEventRecord = {
      id: 'evt-1',
      tenant_id: 'comp-1',
      event_code: r4020Draft.eventCode,
      event_name: r4020Draft.eventName,
      event_series: r4020Draft.eventSeries,
      event_uid: r4020Draft.eventUid,
      competence: '2026-11',
      ind_retif: 1,
      tp_amb: 2,
      status: 'accepted',
      receipt_number: '1.1.202611.0000000000-00000001',
      validation_errors: [],
      validation_warnings: [],
      payload_summary: r4020Draft.payloadSummary,
      xml_content: r4020Draft.xmlContent,
      return_totals: r4020Draft.returnTotals,
      created_at: '2026-11-20T10:00:00Z',
      updated_at: '2026-11-20T10:00:00Z',
    };

    const r4099 = buildReinfR4099Event({
      company: mockCompany,
      config,
      competence: '2026-11',
      fechRet: 0,
      eventsForCompetence: [storedR4020],
    });
    expect(r4099.validationErrors).toHaveLength(0);
    expect(r4099.returnTotals?.r9015_dctfweb_ret).toBe(615);

    const r2099 = buildReinfR2099Event({
      company: mockCompany,
      config,
      competence: '2026-11',
      eventsForCompetence: [storedR4020],
    });
    expect(r2099.validationErrors).toHaveLength(0);
    expect(r2099.xmlContent).toContain('<evtServTm>N</evtServTm>');

    const r9000 = buildReinfR9000Event({
      company: mockCompany,
      config,
      targetEvent: storedR4020,
    });
    expect(r9000.validationErrors).toHaveLength(0);
    expect(r9000.xmlContent).toContain('<tpEvento>R-4020</tpEvento>');
  });
});
