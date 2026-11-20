import { supabase } from '../../lib/supabase';
import type {
  EmployeeBenefitRecord,
  EmployeeBenefitStatus,
  EmployeeVacationRecord,
  EmployeeVacationStatus,
} from '../../types/database';

const VACATION_SELECT_COLUMNS =
  'id, tenant_id, employee_id, acquisitive_period_label, acquisitive_start, acquisitive_end, concessive_limit, start_date, end_date, days_taken, sold_days, doubled_days, fraction_number, unjustified_absences, notice_date, payment_due_date, competence, payroll_entry_id, advance_13th_requested, status, estimated_gross_amount, estimated_third_amount, estimated_abono_amount, estimated_double_amount, notes, approved_by, approved_at, created_at, updated_at';

const BENEFIT_SELECT_COLUMNS =
  'id, tenant_id, employee_id, benefit_type, provider_name, plan_name, card_or_policy_number, monthly_employer_value, employee_discount_mode, employee_discount_value, coparticipation_value, dependents_covered, include_in_payroll, is_taxable, status, start_date, end_date, notes, created_at, updated_at';

function isMissingRelationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return code === '42P01' || code === 'PGRST205' || msg.includes('does not exist');
}

export type CreateEmployeeVacationInput = Omit<
  EmployeeVacationRecord,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;

export type CreateEmployeeBenefitInput = Omit<
  EmployeeBenefitRecord,
  'id' | 'tenant_id' | 'created_at' | 'updated_at'
>;

export async function fetchEmployeeVacationsService(): Promise<EmployeeVacationRecord[]> {
  const { data, error } = await supabase
    .from('employee_vacations')
    .select(VACATION_SELECT_COLUMNS)
    .order('start_date', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }
  return (data || []) as EmployeeVacationRecord[];
}

export async function createEmployeeVacationService(
  tenantId: string,
  input: CreateEmployeeVacationInput
): Promise<EmployeeVacationRecord> {
  const { data, error } = await supabase
    .from('employee_vacations')
    .insert({
      ...input,
      tenant_id: tenantId,
    })
    .select(VACATION_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao registrar solicitação/programação de férias.');
  }
  return data as EmployeeVacationRecord;
}

export async function updateEmployeeVacationService(
  tenantId: string,
  vacationId: string,
  patch: Partial<
    Omit<EmployeeVacationRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
  > & { status?: EmployeeVacationStatus }
): Promise<EmployeeVacationRecord> {
  const { data, error } = await supabase
    .from('employee_vacations')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vacationId)
    .eq('tenant_id', tenantId)
    .select(VACATION_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao atualizar registro de férias.');
  }
  return data as EmployeeVacationRecord;
}

export async function deleteEmployeeVacationService(
  tenantId: string,
  vacationId: string
): Promise<void> {
  const { error } = await supabase
    .from('employee_vacations')
    .delete()
    .eq('id', vacationId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
}

export async function fetchEmployeeBenefitsService(): Promise<EmployeeBenefitRecord[]> {
  const { data, error } = await supabase
    .from('employee_benefits')
    .select(BENEFIT_SELECT_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw new Error(error.message);
  }
  return (data || []) as EmployeeBenefitRecord[];
}

export async function createEmployeeBenefitService(
  tenantId: string,
  input: CreateEmployeeBenefitInput
): Promise<EmployeeBenefitRecord> {
  const { data, error } = await supabase
    .from('employee_benefits')
    .insert({
      ...input,
      tenant_id: tenantId,
    })
    .select(BENEFIT_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao adicionar benefício do colaborador.');
  }
  return data as EmployeeBenefitRecord;
}

export async function updateEmployeeBenefitService(
  tenantId: string,
  benefitId: string,
  patch: Partial<
    Omit<EmployeeBenefitRecord, 'id' | 'tenant_id' | 'employee_id' | 'created_at'>
  > & { status?: EmployeeBenefitStatus }
): Promise<EmployeeBenefitRecord> {
  const { data, error } = await supabase
    .from('employee_benefits')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', benefitId)
    .eq('tenant_id', tenantId)
    .select(BENEFIT_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao atualizar benefício do colaborador.');
  }
  return data as EmployeeBenefitRecord;
}

export async function deleteEmployeeBenefitService(
  tenantId: string,
  benefitId: string
): Promise<void> {
  const { error } = await supabase
    .from('employee_benefits')
    .delete()
    .eq('id', benefitId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
}
