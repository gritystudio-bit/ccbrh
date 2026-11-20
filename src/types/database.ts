export type CompanyStatus = 'pending_review' | 'active' | 'inactive';

export interface CompanyBranch {
  id: string;
  company_id: string;
  label: string;
  cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_headquarters?: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  cnpj_root?: string | null;
  email?: string | null;
  telefone?: string | null;
  area_atuacao?: string | null;
  porte?: 'micro' | 'pequena' | 'media' | 'grande';
  descricao?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  tem_filiais?: boolean;
  responsavel_nome?: string | null;
  responsavel_cargo?: string | null;
  beneficios?: string[];
  status?: CompanyStatus;
  created_at: string;
}

export interface Job {
  id: string;
  tenant_id: string;
  title: string;
  department: string;
  base_salary: number;
  created_at: string;
}

export type EmployeeStatus = 'active' | 'inactive' | 'vacation';
export type EmployeeContractType = 'clt' | 'pj';

export interface EmployeePersonalInfo {
  avatar_url?: string | null;
  nationality?: string;
  birth_state?: string;
  birth_city?: string;
  ethnicity?: string;
  gender?: string;
  document_gender?: string;
  social_name?: string;
  marital_status?: string;
  birth_date?: string;
  mother_name?: string;
  father_name?: string;
  sexual_orientation?: string;
  corporate_email_surname?: string;
  team_name?: string;
  registration_number?: string;
  has_disability?: boolean;
  disability_type?: string;
  disability_notes?: string;
  rg_number?: string;
}

export interface EmployeeAddressInfo {
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  personal_email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
}

export interface EmployeeBankAccount {
  id: string;
  bank_name: string;
  account_type: 'Conta Corrente' | 'Conta Poupança' | 'Conta Salário' | 'Conta Pagamento';
  branch_number: string;
  account_number: string;
  pix_key?: string;
  attachment_name?: string;
  attachment_document_id?: string | null;
}

export interface EmployeeEducationItem {
  id: string;
  level:
    | 'Ensino Médio completo'
    | 'Técnico completo'
    | 'Educação Superior incompleta'
    | 'Educação Superior completa'
    | 'Pós-graduação / MBA'
    | 'Mestrado / Doutorado';
  institution: string;
  course: string;
  conclusion_year: string;
  attachment_name?: string;
  attachment_document_id?: string | null;
}

export interface EmployeeDependentItem {
  id: string;
  full_name: string;
  relationship: 'Filho(a) / Enteado(a)' | 'Cônjuge / Companheiro(a)' | 'Pais / Avós' | 'Outro';
  birth_date: string;
  cpf?: string;
  irrf_dependent: boolean;
}

export interface EmployeeAdditionalInfo {
  authorize_birthday_disclosure?: string;
  has_children?: string;
  children_info?: string;
  pets?: string;
  languages?: string;
  dietary_restriction?: string;
  shirt_size?: string;
  hobbies?: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  job_id: string;
  branch_id?: string | null;
  reports_to: string | null;
  full_name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
  contract_type: EmployeeContractType;
  pj_company_name?: string | null;
  pj_cnpj?: string | null;
  pj_monthly_value?: number | null;
  dependents_count?: number;
  salary_override?: number | null;
  vt_opted_in?: boolean;
  vr_discount?: number;
  health_plan_discount?: number;
  personal_info?: EmployeePersonalInfo;
  address_info?: EmployeeAddressInfo;
  bank_accounts?: EmployeeBankAccount[];
  education_history?: EmployeeEducationItem[];
  dependents_list?: EmployeeDependentItem[];
  additional_info?: EmployeeAdditionalInfo;
  last_vacation_settled_until?: string | null;
  status: EmployeeStatus;
  hire_date: string;
  resignation_date: string | null;
  created_at: string;
}

export type ApiSource = 'internal' | 'linkedin' | 'indeed' | 'company_form';
export type VacancyStatus = 'open' | 'closed' | 'paused';

export interface Vacancy {
  id: string;
  tenant_id: string;
  job_id: string;
  branch_id?: string | null;
  title: string;
  area?: string | null;
  description: string;
  requirements?: string | null;
  salary?: number | null;
  vacancies_count?: number;
  contract_type?: 'clt' | 'pj' | 'temporario' | 'estagio';
  work_mode?: 'presencial' | 'hibrido' | 'remoto';
  city?: string | null;
  state?: string | null;
  show_salary?: boolean;
  api_source: ApiSource;
  api_external_id: string | null;
  status: VacancyStatus;
  created_at: string;
}

export type PipelineStage = 'triagem' | 'entrevista' | 'proposta' | 'aprovado';

export interface Candidate {
  id: string;
  tenant_id: string;
  vacancy_id: string;
  talent_id?: string | null;
  full_name: string;
  email: string;
  phone: string;
  linkedin_url?: string | null;
  resume_path?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  pipeline_stage: PipelineStage;
  document_token: string;
  token_expires_at: string;
  created_at: string;
}

export type DocumentType =
  | 'RG'
  | 'CPF'
  | 'Comprovante_Residencia'
  | 'Curriculo'
  | 'Contrato'
  | 'Carteira_Trabalho'
  | 'ASO'
  | 'Diploma_Certificado'
  | 'Comprovante_Bancario'
  | 'Outros';
export type DocumentStatus = 'pending_review' | 'approved' | 'rejected';

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  candidate_id: string | null;
  document_type: DocumentType;
  storage_path: string;
  status: DocumentStatus;
  uploaded_at: string;
}

export type PayrollStatus = 'draft' | 'closed' | 'paid';
export type PayslipSentStatus = 'pending' | 'sent' | 'failed';
export type NfseStatus = 'not_applicable' | 'awaiting_issue' | 'issued' | 'approved';
export type PayrollLeaveType =
  | 'none'
  | 'medical'
  | 'work_accident'
  | 'maternity'
  | 'paternity'
  | 'marriage'
  | 'bereavement'
  | 'unpaid';
export type ThirteenthSalaryMode =
  | 'none'
  | 'first_installment'
  | 'second_installment'
  | 'full_single';

export interface PayrollParameters {
  id?: string;
  tenant_id: string;
  minimum_wage: number;
  patronal_inss_rate: number;
  fgts_rate: number;
  vt_discount_cap_rate: number;
  default_vt_opted_in: boolean;
  default_vr_discount: number;
  apply_lei_15270: boolean;
  vacation_constitutional_third_rate?: number;
  vacation_abono_max_days?: number;
  vacation_min_first_split_days?: number;
  vacation_min_other_split_days?: number;
  vacation_concessive_months?: number;
  vacation_expired_double_pay?: boolean;
  medical_leave_company_paid_days?: number;
  maternity_leave_days?: number;
  paternity_leave_days?: number;
  marriage_leave_days?: number;
  bereavement_leave_days?: number;
  accident_leave_keep_fgts?: boolean;
  maternity_offset_inss_patronal?: boolean;
  pj_default_iss_rate: number;
  pj_default_irrf_rate: number;
  pj_default_pcc_rate: number;
  pj_require_nfse: boolean;
  pj_nfse_due_day: number;
  pj_auto_proportional_dates: boolean;
  updated_at?: string;
}

export interface PayrollEntry {
  id: string;
  tenant_id: string;
  employee_id: string;
  competence: string; // YYYY-MM
  contract_type?: EmployeeContractType;
  base_salary: number;
  worked_days: number;
  dependents_count: number;
  overtime_50_hours: number;
  overtime_100_hours: number;
  night_hours: number;
  insalubrity_rate: number; // 0 | 10 | 20 | 40
  hazard_pay: boolean;
  bonuses: number;
  absence_days: number;
  vt_opted_in: boolean;
  vt_employer_value?: number;
  vr_discount: number;
  other_discounts: number;
  vacation_days?: number;
  vacation_sold_days?: number;
  vacation_doubled_days?: number;
  vacation_period_label?: string | null;
  vacation_amount?: number;
  vacation_abono_amount?: number;
  vacation_double_amount?: number;
  leave_type?: PayrollLeaveType;
  leave_days?: number;
  leave_paid_amount?: number;
  thirteenth_mode?: ThirteenthSalaryMode;
  thirteenth_amount?: number;
  thirteenth_inss_amount?: number;
  thirteenth_irrf_amount?: number;
  maternity_inss_offset_amount?: number;
  overtime_amount: number;
  dsr_amount: number;
  night_shift_amount: number;
  insalubrity_amount: number;
  hazard_amount: number;
  gross_salary: number;
  inss_amount: number;
  irrf_amount: number;
  vt_discount_amount: number;
  absence_discount_amount: number;
  total_discounts: number;
  net_salary: number;
  fgts_amount: number;
  inss_patronal_amount: number;
  provision_13th: number;
  provision_vacation: number;
  status: PayrollStatus;
  payslip_sent_status?: PayslipSentStatus;
  payslip_sent_at?: string | null;
  payslip_sent_channel?: string | null;
  payslip_sent_to?: string | null;
  payslip_last_error?: string | null;
  nfse_number?: string | null;
  nfse_status?: NfseStatus;
  nfse_issued_at?: string | null;
  pj_iss_amount?: number;
  pj_retention_amount?: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TalentBankEntry {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  cpf?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cargo_desejado?: string | null;
  area_interesse?: string | null;
  pretensao_salarial?: number | null;
  disponibilidade: string;
  regime_preferido: string;
  linkedin?: string | null;
  curriculo_url?: string | null;
  status: 'disponivel' | 'em_processo' | 'contratado' | 'inativo';
  created_at: string;
}

export interface ContactLead {
  id: string;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  message: string;
  status: 'novo' | 'em_atendimento' | 'concluido';
  created_at: string;
}

export type EmployeeVacationStatus =
  | 'requested'
  | 'approved'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'canceled'
  | 'rejected';

export interface EmployeeVacationRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  acquisitive_period_label: string;
  acquisitive_start: string;
  acquisitive_end: string;
  concessive_limit: string;
  start_date: string;
  end_date: string;
  days_taken: number;
  sold_days: number;
  doubled_days: number;
  fraction_number: number;
  unjustified_absences: number;
  notice_date?: string | null;
  payment_due_date?: string | null;
  competence?: string | null;
  payroll_entry_id?: string | null;
  advance_13th_requested: boolean;
  status: EmployeeVacationStatus;
  estimated_gross_amount: number;
  estimated_third_amount: number;
  estimated_abono_amount: number;
  estimated_double_amount: number;
  notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type EmployeeBenefitType =
  | 'vale_transporte'
  | 'vale_refeicao'
  | 'vale_alimentacao'
  | 'plano_saude'
  | 'plano_odontologico'
  | 'auxilio_creche'
  | 'auxilio_home_office'
  | 'seguro_vida'
  | 'previdencia_privada'
  | 'vale_cultura'
  | 'auxilio_educacao'
  | 'outros';

export type EmployeeBenefitDiscountMode =
  | 'none'
  | 'fixed'
  | 'percent_salary'
  | 'percent_benefit';

export type EmployeeBenefitStatus = 'active' | 'suspended' | 'canceled';

export interface EmployeeBenefitRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  benefit_type: EmployeeBenefitType;
  provider_name?: string | null;
  plan_name?: string | null;
  card_or_policy_number?: string | null;
  monthly_employer_value: number;
  employee_discount_mode: EmployeeBenefitDiscountMode;
  employee_discount_value: number;
  coparticipation_value: number;
  dependents_covered: number;
  include_in_payroll: boolean;
  is_taxable: boolean;
  status: EmployeeBenefitStatus;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type EsocialEventCategory = 'tabelas' | 'nao_periodicos' | 'periodicos' | 'controle';

export type EsocialEventStatus =
  | 'draft'
  | 'pending'
  | 'validated'
  | 'transmitted'
  | 'accepted'
  | 'rejected'
  | 'excluded';

export type EsocialEventCode =
  | 'S-1000'
  | 'S-1005'
  | 'S-1010'
  | 'S-1020'
  | 'S-2190'
  | 'S-2200'
  | 'S-2205'
  | 'S-2206'
  | 'S-2230'
  | 'S-2299'
  | 'S-2300'
  | 'S-2399'
  | 'S-1200'
  | 'S-1210'
  | 'S-1298'
  | 'S-1299'
  | 'S-3000';

export interface EsocialEmployerConfig {
  id: string;
  tenant_id: string;
  layout_version: string;
  tp_amb: 1 | 2;
  proc_emi: number;
  ver_proc: string;
  class_trib: string;
  ind_coop: number;
  ind_constr: number;
  ind_des_folha: number;
  ind_opt_reg_eletron: number;
  fpas: string;
  cod_tercs: string;
  aliq_rat: number;
  fap: number;
  cod_lotacao: string;
  tp_lotacao: string;
  ide_tab_rubr: string;
  cnae_prep: string;
  cnpj_sind_default: string;
  trans_dctfweb: boolean;
  created_at: string;
  updated_at: string;
}

export interface EsocialReturnTotals {
  s5001_inss_segurado?: number;
  s5001_base_cp?: number;
  s5002_irrf_retido?: number;
  s5002_base_irrf?: number;
  s5002_lei15270_isento?: boolean;
  s5003_fgts_mensal?: number;
  s5003_base_fgts?: number;
  s5011_cp_patronal?: number;
  s5011_gilrat?: number;
  s5011_terceiros?: number;
  s5012_irrf_consolidado?: number;
  s5013_fgts_digital_total?: number;
}

export interface EsocialEventRecord {
  id: string;
  tenant_id: string;
  event_code: EsocialEventCode;
  event_name: string;
  event_category: EsocialEventCategory;
  event_uid: string;
  competence?: string | null;
  employee_id?: string | null;
  payroll_entry_id?: string | null;
  vacation_id?: string | null;
  ind_retif: 1 | 2;
  tp_amb: 1 | 2;
  status: EsocialEventStatus;
  receipt_number?: string | null;
  protocol_number?: string | null;
  orig_receipt_number?: string | null;
  validation_errors: string[];
  validation_warnings: string[];
  payload_summary: Record<string, string | number | boolean | null>;
  xml_content: string;
  return_totals?: EsocialReturnTotals | null;
  transmitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReinfEventSeries = 'tabelas' | 'r2000' | 'r4000' | 'controle';

export type ReinfEventStatus =
  | 'draft'
  | 'pending'
  | 'validated'
  | 'transmitted'
  | 'accepted'
  | 'rejected'
  | 'excluded';

export type ReinfEventCode =
  | 'R-1000'
  | 'R-1050'
  | 'R-1070'
  | 'R-2010'
  | 'R-2020'
  | 'R-2060'
  | 'R-2098'
  | 'R-2099'
  | 'R-4010'
  | 'R-4020'
  | 'R-4040'
  | 'R-4080'
  | 'R-4099'
  | 'R-9000';

export interface ReinfContributorConfig {
  id: string;
  tenant_id: string;
  layout_version: string;
  tp_amb: 1 | 2;
  proc_emi: 1 | 2;
  ver_proc: string;
  class_trib: string;
  ind_escrituracao: 0 | 1;
  ind_desoneracao: 0 | 1;
  ind_acordo_isen_multa: 0 | 1;
  ind_sit_pj: 0 | 1 | 2 | 3 | 4;
  contato_nome: string;
  contato_cpf: string;
  contato_fone: string;
  contato_email: string;
  resp_nome: string;
  resp_cpf: string;
  default_nat_rend_pj: string;
  default_tp_servico_cp: string;
  trans_dctfweb: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReinfReturnTotals {
  r9001_base_cp?: number;
  r9001_ret_cp?: number;
  r9001_cprb?: number;
  r9005_base_ir?: number;
  r9005_vlr_ir?: number;
  r9005_vlr_csll?: number;
  r9005_vlr_cofins?: number;
  r9005_vlr_pp?: number;
  r9005_vlr_agreg?: number;
  r9011_dctfweb_cp?: number;
  r9015_dctfweb_ret?: number;
  ident_escrit_dctf?: string;
}

export interface ReinfEventRecord {
  id: string;
  tenant_id: string;
  event_code: ReinfEventCode;
  event_name: string;
  event_series: ReinfEventSeries;
  event_uid: string;
  competence?: string | null;
  employee_id?: string | null;
  payroll_entry_id?: string | null;
  beneficiary_doc?: string | null;
  beneficiary_name?: string | null;
  nat_rend?: string | null;
  ind_retif: 1 | 2;
  tp_amb: 1 | 2;
  status: ReinfEventStatus;
  receipt_number?: string | null;
  protocol_number?: string | null;
  orig_receipt_number?: string | null;
  validation_errors: string[];
  validation_warnings: string[];
  payload_summary: Record<string, string | number | boolean | null>;
  xml_content: string;
  return_totals?: ReinfReturnTotals | null;
  transmitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CcbDatabase {
  companies: Company[];
  branches: CompanyBranch[];
  jobs: Job[];
  employees: Employee[];
  vacancies: Vacancy[];
  candidates: Candidate[];
  documents: DocumentRecord[];
  payrollEntries: PayrollEntry[];
  payrollParameters: PayrollParameters[];
  employeeVacations: EmployeeVacationRecord[];
  employeeBenefits: EmployeeBenefitRecord[];
  talentBank: TalentBankEntry[];
  contactLeads: ContactLead[];
}

export type AuthRole = 'diretoria_ccb' | 'consultor_rh' | 'analista_dp';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  roleLabel: string;
  avatarUrl?: string | null;
  tenantId: 'all';
  companyName: string;
  loggedInAt: string;
}
