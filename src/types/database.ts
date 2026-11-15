export type CompanyStatus = 'pending_review' | 'active' | 'inactive';

export interface CompanyBranch {
  id: string; // UUID (PK)
  company_id: string; // UUID (FK -> companies.id)
  label: string; // Ex: Matriz (Cidade Jardim - São Paulo)
  cnpj: string; // CNPJ completo da unidade (14 dígitos)
  endereco?: string;
  cidade?: string;
  estado?: string;
  is_headquarters?: boolean;
  created_at: string;
}

export interface Company {
  id: string; // UUID (PK)
  name: string; // VARCHAR(255)
  cnpj: string; // CNPJ completo da matriz (14 dígitos)
  cnpj_root?: string; // Raiz do CNPJ (8 dígitos) quando há matriz + filiais
  email?: string;
  telefone?: string;
  area_atuacao?: string;
  porte?: 'micro' | 'pequena' | 'media' | 'grande';
  endereco?: string;
  cidade?: string;
  estado?: string;
  responsavel_nome?: string;
  responsavel_cargo?: string;
  beneficios?: string[];
  status?: CompanyStatus;
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export interface Job {
  id: string; // UUID (PK)
  tenant_id: string; // UUID (FK -> companies.id)
  title: string; // VARCHAR(255)
  department: string; // VARCHAR(255)
  base_salary: number; // NUMERIC(10,2)
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export type EmployeeStatus = 'active' | 'inactive' | 'vacation';

export interface Employee {
  id: string; // UUID (PK)
  tenant_id: string; // UUID (FK -> companies.id)
  job_id: string; // UUID (FK -> jobs.id)
  branch_id?: string | null; // UUID (FK -> company_branches.id)
  reports_to: string | null; // UUID (FK -> employees.id)
  full_name: string; // VARCHAR(255)
  email: string; // VARCHAR(255)
  status: EmployeeStatus; // VARCHAR(50) ('active', 'inactive', 'vacation')
  hire_date: string; // DATE (YYYY-MM-DD)
  resignation_date: string | null; // DATE (YYYY-MM-DD)
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export type ApiSource = 'internal' | 'linkedin' | 'indeed' | 'company_form';
export type VacancyStatus = 'open' | 'closed' | 'paused';

export interface Vacancy {
  id: string; // UUID (PK)
  tenant_id: string; // UUID (FK -> companies.id)
  job_id: string; // UUID (FK -> jobs.id)
  branch_id?: string | null; // UUID (FK -> company_branches.id)
  title: string; // VARCHAR(255)
  description: string; // TEXT
  vacancies_count?: number;
  city?: string;
  state?: string;
  show_salary?: boolean;
  api_source: ApiSource; // VARCHAR(100) ('internal', 'linkedin', 'indeed', 'company_form')
  api_external_id: string | null; // VARCHAR(255)
  status: VacancyStatus; // VARCHAR(50) ('open', 'closed', 'paused')
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export type PipelineStage = 'triagem' | 'entrevista' | 'proposta' | 'aprovado';

export interface Candidate {
  id: string; // UUID (PK)
  tenant_id: string; // UUID (FK -> companies.id)
  vacancy_id: string; // UUID (FK -> vacancies.id)
  full_name: string; // VARCHAR(255)
  email: string; // VARCHAR(255)
  phone: string; // VARCHAR(50)
  linkedin_url?: string; // TEXT (Perfil LinkedIn informado na candidatura)
  resume_file_name?: string; // VARCHAR(255) (Currículo anexado na candidatura)
  pipeline_stage: PipelineStage; // VARCHAR(100) ('triagem', 'entrevista', 'proposta', 'aprovado')
  document_token: string; // UUID (UNIQUE, link exclusivo gerado para envio de documentos)
  token_expires_at: string; // TIMESTAMP WITH TIME ZONE
  created_at: string; // TIMESTAMP WITH TIME ZONE
}

export type DocumentType = 'RG' | 'CPF' | 'Comprovante_Residencia' | 'Curriculo';
export type DocumentStatus = 'pending_review' | 'approved' | 'rejected';

export interface DocumentRecord {
  id: string; // UUID (PK)
  tenant_id: string; // UUID (FK -> companies.id)
  employee_id: string | null; // UUID (FK -> employees.id, NULL se for candidato)
  candidate_id: string | null; // UUID (FK -> candidates.id, NULL se for contratado)
  document_type: DocumentType; // VARCHAR(100)
  storage_path: string; // TEXT (Bucket no Supabase Storage)
  status: DocumentStatus; // VARCHAR(50) ('pending_review', 'approved', 'rejected')
  uploaded_at: string; // TIMESTAMP WITH TIME ZONE
}

export interface HireGridDatabase {
  companies: Company[];
  branches: CompanyBranch[];
  jobs: Job[];
  employees: Employee[];
  vacancies: Vacancy[];
  candidates: Candidate[];
  documents: DocumentRecord[];
}

export interface AIAgentResponse {
  module: 'Core' | 'R&S' | 'Portal do Candidato' | 'Financeiro';
  analysis: string;
  recommendedActions: string[];
  sqlCode?: string;
  rawMarkdown?: string;
  timestamp: string;
}

export type AuthRole = 'diretoria_ccb' | 'consultor_rh' | 'analista_dp';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  roleLabel: string;
  tenantId: 'all';
  companyName: string;
  token: string;
  loggedInAt: string;
}
