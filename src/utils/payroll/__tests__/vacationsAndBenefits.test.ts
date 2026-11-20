import { describe, expect, it } from 'vitest';
import type {
  Employee,
  EmployeeBenefitRecord,
  EmployeeVacationRecord,
  PayrollEntry,
} from '../../../types/database';
import {
  analyzeEmployeeVacationCycles,
  buildDefaultCompanyPayrollParameters,
  calculateCltPayroll,
  calculateEndDateIso,
  calculateSingleBenefitMonthlyImpact,
  checkArt134Par3StartDate,
  estimateVacationFinancials,
  getEntitledVacationDaysByAbsences,
  subtractDaysIso,
  summarizeEmployeeBenefits,
  validateVacationRequest,
} from '../../payrollCalculator';
import type { VacationCyclePeriod } from '../vacationCycles';

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    tenant_id: 'tenant-1',
    job_id: 'job-1',
    reports_to: null,
    full_name: 'Maria Clara Souza',
    email: 'maria@empresa.com.br',
    contract_type: 'clt',
    status: 'active',
    hire_date: '2024-01-10',
    resignation_date: null,
    created_at: '2024-01-10T10:00:00Z',
    ...overrides,
  };
}

function makeCycle(overrides: Partial<VacationCyclePeriod> = {}): VacationCyclePeriod {
  return {
    index: 1,
    label: '2025/2026',
    acquisitiveStart: '2025-01-10',
    acquisitiveEnd: '2026-01-09',
    concessiveLimit: '2027-01-09',
    status: 'open_concessive',
    entitledDays: 30,
    takenDays: 0,
    soldDays: 0,
    remainingDays: 30,
    isDoubledArt137: false,
    ...overrides,
  };
}

describe('Férias CLT — Escala de Faltas (Art. 130) e Datas (Art. 134 §3º, 135, 145)', () => {
  it('calcula exatamente a redução proporcional por faltas injustificadas do Art. 130 CLT', () => {
    expect(getEntitledVacationDaysByAbsences(0)).toBe(30);
    expect(getEntitledVacationDaysByAbsences(5)).toBe(30);
    expect(getEntitledVacationDaysByAbsences(6)).toBe(24);
    expect(getEntitledVacationDaysByAbsences(14)).toBe(24);
    expect(getEntitledVacationDaysByAbsences(15)).toBe(18);
    expect(getEntitledVacationDaysByAbsences(23)).toBe(18);
    expect(getEntitledVacationDaysByAbsences(24)).toBe(12);
    expect(getEntitledVacationDaysByAbsences(32)).toBe(12);
    expect(getEntitledVacationDaysByAbsences(33)).toBe(0);
  });

  it('veda início de férias 2 dias antes do DSR (sexta/sábado/domingo) e antes de feriados nacionais', () => {
    // 2026-11-23 é segunda-feira (permitido)
    expect(checkArt134Par3StartDate('2026-11-23').allowed).toBe(true);
    // 2026-11-27 é sexta-feira -> 2 dias antes de domingo (vedado)
    expect(checkArt134Par3StartDate('2026-11-27').allowed).toBe(false);
    // 2026-11-28 é sábado -> 1 dia antes de domingo (vedado)
    expect(checkArt134Par3StartDate('2026-11-28').allowed).toBe(false);
    // 2026-04-30 é quinta-feira, 1 dia antes de 01/05 (Dia do Trabalhador) -> vedado
    expect(checkArt134Par3StartDate('2026-04-30').allowed).toBe(false);
    // 2026-04-29 é quarta-feira, 2 dias antes de 01/05 -> vedado
    expect(checkArt134Par3StartDate('2026-04-29').allowed).toBe(false);
  });

  it('calcula prazos legais de término, aviso (Art. 135) e pagamento (Art. 145)', () => {
    expect(calculateEndDateIso('2026-07-06', 14)).toBe('2026-07-19');
    expect(subtractDaysIso('2026-07-06', 30)).toBe('2026-06-06');
    expect(subtractDaysIso('2026-07-06', 2)).toBe('2026-07-04');
  });
});

describe('Férias CLT — Fracionamento (Art. 134 §1º), Abono (Art. 143) e Dobra (Art. 137)', () => {
  it('valida regras de fracionamento em até 3 períodos (1º >= 14d, demais >= 5d e sem resíduo inválido)', () => {
    const cycle = makeCycle();

    // Período único de 14 dias é válido (restam 16d >= 14d ou >= 5d)
    const ok14 = validateVacationRequest({
      contractType: 'clt',
      cycle,
      startDate: '2026-06-01', // segunda-feira
      daysTaken: 14,
      soldDays: 0,
      unjustifiedAbsences: 0,
      referenceTodayIso: '2026-04-01',
    });
    expect(ok14.valid).toBe(true);

    // Menor que 5 dias é bloqueado
    const lt5 = validateVacationRequest({
      contractType: 'clt',
      cycle,
      startDate: '2026-06-01',
      daysTaken: 4,
      soldDays: 0,
      unjustifiedAbsences: 0,
      referenceTodayIso: '2026-04-01',
    });
    expect(lt5.valid).toBe(false);

    // 27 dias deixaria saldo residual de 3 dias (< 5 dias mínimo) -> bloqueado
    const residual3 = validateVacationRequest({
      contractType: 'clt',
      cycle,
      startDate: '2026-06-01',
      daysTaken: 27,
      soldDays: 0,
      unjustifiedAbsences: 0,
      referenceTodayIso: '2026-04-01',
    });
    expect(residual3.valid).toBe(false);

    // 1ª parcela de 10d deixaria 20d (>= 14d possível na 2ª), mas 3ª tentativa sem nenhuma >= 14d deve falhar
    const twoSmallSplits: EmployeeVacationRecord[] = [
      {
        id: 'v1',
        tenant_id: 't1',
        employee_id: 'emp-1',
        acquisitive_period_label: '2025/2026',
        acquisitive_start: '2025-01-10',
        acquisitive_end: '2026-01-09',
        concessive_limit: '2027-01-09',
        start_date: '2026-02-02',
        end_date: '2026-02-11',
        days_taken: 10,
        sold_days: 0,
        doubled_days: 0,
        fraction_number: 1,
        unjustified_absences: 0,
        advance_13th_requested: false,
        status: 'completed',
        estimated_gross_amount: 0,
        estimated_third_amount: 0,
        estimated_abono_amount: 0,
        estimated_double_amount: 0,
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:00:00Z',
      },
      {
        id: 'v2',
        tenant_id: 't1',
        employee_id: 'emp-1',
        acquisitive_period_label: '2025/2026',
        acquisitive_start: '2025-01-10',
        acquisitive_end: '2026-01-09',
        concessive_limit: '2027-01-09',
        start_date: '2026-04-06',
        end_date: '2026-04-15',
        days_taken: 10,
        sold_days: 0,
        doubled_days: 0,
        fraction_number: 2,
        unjustified_absences: 0,
        advance_13th_requested: false,
        status: 'completed',
        estimated_gross_amount: 0,
        estimated_third_amount: 0,
        estimated_abono_amount: 0,
        estimated_double_amount: 0,
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
    ];

    const thirdAttemptSmall = validateVacationRequest({
      contractType: 'clt',
      cycle: makeCycle({ takenDays: 20, remainingDays: 10 }),
      startDate: '2026-06-01',
      daysTaken: 10,
      soldDays: 0,
      unjustifiedAbsences: 0,
      existingCycleRecords: twoSmallSplits,
      referenceTodayIso: '2026-04-01',
    });
    expect(thirdAttemptSmall.valid).toBe(false);
  });

  it('calcula abono pecuniário isento (Art. 143) e dobra em férias após concessivo (Art. 137)', () => {
    const expiredCycle = makeCycle({
      label: '2024/2025',
      acquisitiveStart: '2024-01-10',
      acquisitiveEnd: '2025-01-09',
      concessiveLimit: '2026-01-09',
      status: 'expired_double',
      isDoubledArt137: true,
    });

    const validation = validateVacationRequest({
      contractType: 'clt',
      cycle: expiredCycle,
      startDate: '2026-06-01',
      daysTaken: 20,
      soldDays: 10,
      unjustifiedAbsences: 0,
      referenceTodayIso: '2026-04-01',
    });

    expect(validation.valid).toBe(true);
    expect(validation.doubledDays).toBe(20);

    const fin = estimateVacationFinancials({
      baseSalary: 3000,
      daysTaken: 20,
      soldDays: 10,
      doubledDays: validation.doubledDays,
    });

    // 20d = 2000 + 1/3 (666.60) = 2666.60; abono 10d = 1000 + 333.30 = 1333.30; dobra = 2666.60
    expect(fin.vacationBaseAmount).toBe(2000);
    expect(fin.totalAbonoAmount).toBeCloseTo(1333.3, 1);
    expect(fin.doubleAmount).toBeCloseTo(2666.6, 1);

    // Abono pecuniário não entra na base tributável do INSS/FGTS no motor CLT
    const payrollOnlyAbono = calculateCltPayroll({
      baseSalary: 3000,
      workedDays: 20,
      vacationDays: 10,
      vacationSoldDays: 10,
    });
    const payrollNoAbono = calculateCltPayroll({
      baseSalary: 3000,
      workedDays: 20,
      vacationDays: 10,
      vacationSoldDays: 0,
    });
    expect(payrollOnlyAbono.inssAmount).toBe(payrollNoAbono.inssAmount);
    expect(payrollOnlyAbono.fgtsAmount).toBe(payrollNoAbono.fgtsAmount);
    expect(payrollOnlyAbono.grossSalary).toBeGreaterThan(payrollNoAbono.grossSalary);
  });

  it('evita dupla contagem entre employee_vacations e payroll_entries em analyzeEmployeeVacationCycles', () => {
    const emp = makeEmployee({ hire_date: '2024-01-10', last_vacation_settled_until: '1900-01-01' });

    const vacRecord: EmployeeVacationRecord = {
      id: 'vac-1',
      tenant_id: 'tenant-1',
      employee_id: emp.id,
      acquisitive_period_label: '2024/2025',
      acquisitive_start: '2024-01-10',
      acquisitive_end: '2025-01-09',
      concessive_limit: '2026-01-09',
      start_date: '2025-06-02',
      end_date: '2025-06-15',
      days_taken: 14,
      sold_days: 6,
      doubled_days: 0,
      fraction_number: 1,
      unjustified_absences: 0,
      competence: '2025-06',
      payroll_entry_id: 'pay-1',
      advance_13th_requested: false,
      status: 'completed',
      estimated_gross_amount: 0,
      estimated_third_amount: 0,
      estimated_abono_amount: 0,
      estimated_double_amount: 0,
      created_at: '2025-05-01T10:00:00Z',
      updated_at: '2025-05-01T10:00:00Z',
    };

    const linkedPayrollEntry: PayrollEntry = {
      id: 'pay-1',
      tenant_id: 'tenant-1',
      employee_id: emp.id,
      competence: '2025-06',
      base_salary: 3000,
      worked_days: 16,
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
      vacation_days: 14,
      vacation_sold_days: 6,
      overtime_amount: 0,
      dsr_amount: 0,
      night_shift_amount: 0,
      insalubrity_amount: 0,
      hazard_amount: 0,
      gross_salary: 3000,
      inss_amount: 250,
      irrf_amount: 0,
      vt_discount_amount: 0,
      absence_discount_amount: 0,
      total_discounts: 250,
      net_salary: 2750,
      fgts_amount: 240,
      inss_patronal_amount: 600,
      provision_13th: 250,
      provision_vacation: 333,
      status: 'paid',
      created_at: '2025-06-01T10:00:00Z',
      updated_at: '2025-06-01T10:00:00Z',
    };

    const summary = analyzeEmployeeVacationCycles({
      employee: emp,
      competence: '2026-03',
      existingEntries: [linkedPayrollEntry],
      vacationRecords: [vacRecord],
    });

    const cycle2024 = summary.cycles.find((c) => c.label === '2024/2025');
    expect(cycle2024).toBeDefined();
    // Deve consumir apenas 14 + 6 = 20 dias (restando 10), nunca 40 dias duplicados
    expect(cycle2024?.takenDays).toBe(14);
    expect(cycle2024?.soldDays).toBe(6);
    expect(cycle2024?.remainingDays).toBe(10);
  });
});

describe('Meus Benefícios — Lei 7.418/85 (VT), Decreto 10.854/21 (PAT) e Folha', () => {
  it('limita o desconto de VT ao menor valor entre 6% do salário e o valor efetivo pago (Lei 7.418/85)', () => {
    // Salário 5000 -> 6% seria 300; se custo efetivo de VT é 220, desconto deve ser 220
    const resLowCost = calculateCltPayroll({
      baseSalary: 5000,
      workedDays: 30,
      vtOptedIn: true,
      vtEmployerValue: 220,
    });
    expect(resLowCost.vtDiscountAmount).toBe(220);

    // Salário 2000 -> 6% = 120; se custo efetivo é 350, desconto fica limitado a 120
    const resHighCost = calculateCltPayroll({
      baseSalary: 2000,
      workedDays: 30,
      vtOptedIn: true,
      vtEmployerValue: 350,
    });
    expect(resHighCost.vtDiscountAmount).toBe(120);
  });

  it('gera alerta de conformidade quando desconto do VR/VA ultrapassa teto PAT de 20%', () => {
    const params = buildDefaultCompanyPayrollParameters('tenant-1');

    const vtBenefit: EmployeeBenefitRecord = {
      id: 'b-vt',
      tenant_id: 'tenant-1',
      employee_id: 'emp-1',
      benefit_type: 'vale_transporte',
      monthly_employer_value: 200,
      employee_discount_mode: 'percent_salary',
      employee_discount_value: 6,
      coparticipation_value: 0,
      dependents_covered: 0,
      include_in_payroll: true,
      is_taxable: false,
      status: 'active',
      start_date: '2026-01-01',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const vrExceedingPat: EmployeeBenefitRecord = {
      id: 'b-vr',
      tenant_id: 'tenant-1',
      employee_id: 'emp-1',
      benefit_type: 'vale_refeicao',
      monthly_employer_value: 500,
      employee_discount_mode: 'fixed',
      employee_discount_value: 150, // 30% > 20% (R$ 100)
      coparticipation_value: 0,
      dependents_covered: 0,
      include_in_payroll: true,
      is_taxable: false,
      status: 'active',
      start_date: '2026-01-01',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const impactVr = calculateSingleBenefitMonthlyImpact(vrExceedingPat, 4000, params);
    expect(impactVr.complianceWarnings.length).toBeGreaterThan(0);

    const summary = summarizeEmployeeBenefits([vtBenefit, vrExceedingPat], 4000, params);
    expect(summary.activeCount).toBe(2);
    expect(summary.vtOptedIn).toBe(true);
    expect(summary.vtEmployerValue).toBe(200);
    // 6% de 4000 = 240, mas limitado a 200 (custo efetivo do VT)
    expect(summary.vtDiscount).toBe(200);
    expect(summary.vrVaDiscount).toBe(150);
    expect(summary.totalEmployeeDiscount).toBe(350);
  });
});
