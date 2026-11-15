-- ============================================================================
-- CCBRH SAAS - ESQUEMA COMPLETO PARA SUPABASE (POSTGRESQL + RLS + STORAGE)
-- ============================================================================
-- Modelo Operacional:
--   - SaaS EXCLUSIVO da equipe interna da CCB Soluções em RH.
--   - A CCB gerencia empresas clientes cadastradas (tenants).
--   - Dados isolados por tenant_id com Row Level Security (RLS).
--   - Inclui Folha de Pagamento CLT, Banco de Talentos, Leads, Endereço e Geolocalização.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABELAS PRINCIPAIS
-- ============================================================================

-- 1.1. companies (Empresas Clientes Cadastradas / Tenants)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    cnpj_root VARCHAR(10),
    email VARCHAR(255),
    telefone VARCHAR(50),
    area_atuacao VARCHAR(255),
    porte VARCHAR(30) DEFAULT 'pequena' CHECK (porte IN ('micro', 'pequena', 'media', 'grande')),
    descricao TEXT,
    logo_url TEXT,
    regulamento_url TEXT,
    codigo_conduta_url TEXT,
    endereco VARCHAR(255),
    numero VARCHAR(30),
    complemento VARCHAR(120),
    bairro VARCHAR(120),
    cidade VARCHAR(120),
    estado VARCHAR(50),
    cep VARCHAR(20),
    tem_filiais BOOLEAN NOT NULL DEFAULT false,
    responsavel_nome VARCHAR(255),
    responsavel_cargo VARCHAR(150),
    beneficios TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('pending_review', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj_root ON public.companies(cnpj_root);

-- 1.2. company_branches (Matriz e Filiais vinculadas à empresa cliente)
CREATE TABLE IF NOT EXISTS public.company_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    label VARCHAR(150) NOT NULL DEFAULT 'Unidade',
    cnpj VARCHAR(18) UNIQUE,
    endereco VARCHAR(255),
    cidade VARCHAR(120),
    estado VARCHAR(50),
    cep VARCHAR(20),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    is_headquarters BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_company_branches_company ON public.company_branches(company_id);

-- 1.3. user_profiles (Contas EXCLUSIVAS da equipe interna CCB via Supabase Auth)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'consultor_rh' CHECK (role IN ('diretoria_ccb', 'consultor_rh', 'analista_dp')),
    role_label VARCHAR(120) NOT NULL DEFAULT 'Consultor(a) de RH · CCB',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.4. jobs (Cargos e Salários isolados por empresa cliente)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON public.jobs(tenant_id);

-- 1.5. employees (Colaboradores Ativos, Férias, Desligados e Organograma)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.company_branches(id) ON DELETE SET NULL,
    reports_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    phone VARCHAR(50),
    contract_type VARCHAR(20) NOT NULL DEFAULT 'clt' CHECK (contract_type IN ('clt', 'pj')),
    pj_company_name VARCHAR(255),
    pj_cnpj VARCHAR(20),
    pj_monthly_value NUMERIC(10,2) CHECK (pj_monthly_value IS NULL OR pj_monthly_value >= 0),
    dependents_count INTEGER NOT NULL DEFAULT 0 CHECK (dependents_count >= 0),
    salary_override NUMERIC(10,2) CHECK (salary_override IS NULL OR salary_override >= 0),
    vt_opted_in BOOLEAN NOT NULL DEFAULT true,
    vr_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (vr_discount >= 0),
    health_plan_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (health_plan_discount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation')),
    hire_date DATE NOT NULL,
    resignation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_job ON public.employees(job_id);
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON public.employees(reports_to);

-- 1.6. vacancies (Vagas isoladas por empresa cliente e unidade/filial)
CREATE TABLE IF NOT EXISTS public.vacancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.company_branches(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    area VARCHAR(150),
    description TEXT,
    requirements TEXT,
    salary NUMERIC(10,2),
    show_salary BOOLEAN NOT NULL DEFAULT true,
    vacancies_count INTEGER NOT NULL DEFAULT 1 CHECK (vacancies_count >= 1),
    contract_type VARCHAR(30) NOT NULL DEFAULT 'clt' CHECK (contract_type IN ('clt', 'pj', 'temporario', 'estagio')),
    work_mode VARCHAR(30) NOT NULL DEFAULT 'presencial' CHECK (work_mode IN ('presencial', 'hibrido', 'remoto')),
    city VARCHAR(120),
    state VARCHAR(50),
    api_source VARCHAR(100) NOT NULL DEFAULT 'internal' CHECK (api_source IN ('internal', 'linkedin', 'indeed', 'company_form')),
    api_external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_vacancies_tenant ON public.vacancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_branch ON public.vacancies(branch_id);
CREATE INDEX IF NOT EXISTS idx_vacancies_status ON public.vacancies(status);

-- 1.7. talent_bank (Currículos cadastrados em /cadastro-talento)
CREATE TABLE IF NOT EXISTS public.talent_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    cpf VARCHAR(20),
    data_nascimento DATE,
    endereco VARCHAR(255),
    cidade VARCHAR(120),
    estado VARCHAR(50),
    cep VARCHAR(20),
    formacao VARCHAR(255),
    instituicao VARCHAR(255),
    area_formacao VARCHAR(255),
    experiencias TEXT,
    habilidades TEXT,
    idiomas VARCHAR(255),
    pretensao_salarial NUMERIC(10,2),
    cargo_desejado VARCHAR(255),
    area_interesse VARCHAR(255),
    disponibilidade VARCHAR(30) NOT NULL DEFAULT 'imediata' CHECK (disponibilidade IN ('imediata', '15_dias', '30_dias', '60_dias')),
    regime_preferido VARCHAR(30) NOT NULL DEFAULT 'presencial' CHECK (regime_preferido IN ('presencial', 'hibrido', 'remoto')),
    linkedin TEXT,
    curriculo_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_processo', 'contratado', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_talent_bank_email ON public.talent_bank(email);
CREATE INDEX IF NOT EXISTS idx_talent_bank_status ON public.talent_bank(status);

-- 1.8. candidates (Candidatos no Pipeline + Endereço + Geolocalização + Token de Autoenvio)
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
    talent_id UUID REFERENCES public.talent_bank(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    linkedin_url TEXT,
    resume_path TEXT,
    cep VARCHAR(20),
    endereco VARCHAR(255),
    numero VARCHAR(30),
    complemento VARCHAR(120),
    bairro VARCHAR(120),
    cidade VARCHAR(120),
    estado VARCHAR(50),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    pipeline_stage VARCHAR(100) NOT NULL DEFAULT 'triagem' CHECK (pipeline_stage IN ('triagem', 'entrevista', 'proposta', 'aprovado')),
    document_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON public.candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_vacancy ON public.candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_candidates_token ON public.candidates(document_token);

-- 1.9. documents (Repositório Unificado de Documentos)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('RG', 'CPF', 'Comprovante_Residencia', 'Curriculo')),
    storage_path TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_document_owner CHECK (
        (employee_id IS NOT NULL AND candidate_id IS NULL) OR
        (employee_id IS NULL AND candidate_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_candidate ON public.documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON public.documents(employee_id);

-- 1.10. payroll_entries (Folha de Pagamento CLT por Colaborador e Competência)
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    competence VARCHAR(7) NOT NULL, -- Formato YYYY-MM
    contract_type VARCHAR(20) NOT NULL DEFAULT 'clt' CHECK (contract_type IN ('clt', 'pj')),
    base_salary NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    worked_days INTEGER NOT NULL DEFAULT 30 CHECK (worked_days BETWEEN 0 AND 31),
    dependents_count INTEGER NOT NULL DEFAULT 0 CHECK (dependents_count >= 0),
    overtime_50_hours NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (overtime_50_hours >= 0),
    overtime_100_hours NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (overtime_100_hours >= 0),
    night_hours NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (night_hours >= 0),
    insalubrity_rate NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (insalubrity_rate IN (0, 10, 20, 40)),
    hazard_pay BOOLEAN NOT NULL DEFAULT false,
    bonuses NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (bonuses >= 0),
    absence_days INTEGER NOT NULL DEFAULT 0 CHECK (absence_days BETWEEN 0 AND 31),
    vt_opted_in BOOLEAN NOT NULL DEFAULT true,
    vr_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (vr_discount >= 0),
    other_discounts NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (other_discounts >= 0),
    overtime_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    dsr_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    night_shift_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    insalubrity_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    hazard_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    gross_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
    inss_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    irrf_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    vt_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    absence_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_discounts NUMERIC(10,2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
    fgts_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    inss_patronal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    provision_13th NUMERIC(10,2) NOT NULL DEFAULT 0,
    provision_vacation NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'closed', 'paid')),
    payslip_sent_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payslip_sent_status IN ('pending', 'sent', 'failed')),
    payslip_sent_at TIMESTAMP WITH TIME ZONE,
    payslip_sent_channel VARCHAR(30),
    payslip_sent_to VARCHAR(255),
    payslip_last_error TEXT,
    nfse_number VARCHAR(60),
    nfse_status VARCHAR(30) NOT NULL DEFAULT 'not_applicable' CHECK (nfse_status IN ('not_applicable', 'awaiting_issue', 'issued', 'approved')),
    nfse_issued_at DATE,
    pj_iss_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (pj_iss_amount >= 0),
    pj_retention_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (pj_retention_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payroll_tenant_emp_comp UNIQUE (tenant_id, employee_id, competence)
);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_comp ON public.payroll_entries(tenant_id, competence);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_entries(employee_id);

-- 1.10b. payroll_parameters (Parâmetros Globais PF/CLT e PJ por empresa)
CREATE TABLE IF NOT EXISTS public.payroll_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    minimum_wage NUMERIC(10,2) NOT NULL DEFAULT 1621.00 CHECK (minimum_wage >= 0),
    patronal_inss_rate NUMERIC(5,4) NOT NULL DEFAULT 0.20 CHECK (patronal_inss_rate >= 0),
    fgts_rate NUMERIC(5,4) NOT NULL DEFAULT 0.08 CHECK (fgts_rate >= 0),
    vt_discount_cap_rate NUMERIC(5,4) NOT NULL DEFAULT 0.06 CHECK (vt_discount_cap_rate >= 0),
    default_vt_opted_in BOOLEAN NOT NULL DEFAULT true,
    default_vr_discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (default_vr_discount >= 0),
    apply_lei_15270 BOOLEAN NOT NULL DEFAULT true,
    pj_default_iss_rate NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (pj_default_iss_rate >= 0),
    pj_default_irrf_rate NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (pj_default_irrf_rate >= 0),
    pj_default_pcc_rate NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (pj_default_pcc_rate >= 0),
    pj_require_nfse BOOLEAN NOT NULL DEFAULT true,
    pj_nfse_due_day INTEGER NOT NULL DEFAULT 5 CHECK (pj_nfse_due_day BETWEEN 1 AND 31),
    pj_auto_proportional_dates BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.11. contact_leads (Mensagens comerciais da Landing Page)
CREATE TABLE IF NOT EXISTS public.contact_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'concluido')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. FUNÇÃO DE SEGURANÇA DO SAAS EXCLUSIVO CCB (RLS HELPER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_ccb_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role IN ('diretoria_ccb', 'consultor_rh', 'analista_dp')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_ccb_diretoria()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role = 'diretoria_ccb'
    );
$$;

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- 3.1. Policies: companies
DROP POLICY IF EXISTS "companies_ccb_manage" ON public.companies;
CREATE POLICY "companies_ccb_manage" ON public.companies
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "companies_public_read_active" ON public.companies;
CREATE POLICY "companies_public_read_active" ON public.companies
    FOR SELECT
    USING (status = 'active' OR public.is_ccb_staff());

DROP POLICY IF EXISTS "companies_public_insert_pending" ON public.companies;
CREATE POLICY "companies_public_insert_pending" ON public.companies
    FOR INSERT
    WITH CHECK (status = 'pending_review');

-- 3.2. Policies: company_branches
DROP POLICY IF EXISTS "branches_ccb_manage" ON public.company_branches;
CREATE POLICY "branches_ccb_manage" ON public.company_branches
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "branches_public_read_active" ON public.company_branches;
CREATE POLICY "branches_public_read_active" ON public.company_branches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = company_id AND c.status = 'active'
        )
        OR public.is_ccb_staff()
    );

DROP POLICY IF EXISTS "branches_public_insert" ON public.company_branches;
CREATE POLICY "branches_public_insert" ON public.company_branches
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = company_id AND c.status = 'pending_review'
        )
    );

-- 3.3. Policies: user_profiles
DROP POLICY IF EXISTS "profiles_self_or_ccb_select" ON public.user_profiles;
CREATE POLICY "profiles_self_or_ccb_select" ON public.user_profiles
    FOR SELECT
    USING (id = auth.uid() OR public.is_ccb_staff());

DROP POLICY IF EXISTS "profiles_diretoria_manage" ON public.user_profiles;
CREATE POLICY "profiles_diretoria_manage" ON public.user_profiles
    FOR ALL
    USING (public.is_ccb_diretoria())
    WITH CHECK (public.is_ccb_diretoria());

-- 3.4. Policies: jobs
DROP POLICY IF EXISTS "ccb_staff_jobs_manage" ON public.jobs;
CREATE POLICY "ccb_staff_jobs_manage" ON public.jobs
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "jobs_public_read_open_vacancies" ON public.jobs;
CREATE POLICY "jobs_public_read_open_vacancies" ON public.jobs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.vacancies v
            WHERE v.job_id = id AND v.status = 'open'
        )
        OR public.is_ccb_staff()
    );

-- 3.5. Policies: employees
DROP POLICY IF EXISTS "ccb_staff_employees_manage" ON public.employees;
CREATE POLICY "ccb_staff_employees_manage" ON public.employees
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- 3.6. Policies: vacancies
DROP POLICY IF EXISTS "vacancies_public_read_open" ON public.vacancies;
CREATE POLICY "vacancies_public_read_open" ON public.vacancies
    FOR SELECT
    USING (status = 'open' OR public.is_ccb_staff());

DROP POLICY IF EXISTS "vacancies_public_company_form_insert" ON public.vacancies;
CREATE POLICY "vacancies_public_company_form_insert" ON public.vacancies
    FOR INSERT
    WITH CHECK (
        (
            api_source = 'company_form'
            AND EXISTS (
                SELECT 1 FROM public.companies c
                WHERE c.id = tenant_id AND c.status = 'pending_review'
            )
        )
        OR public.is_ccb_staff()
    );

DROP POLICY IF EXISTS "vacancies_ccb_update" ON public.vacancies;
CREATE POLICY "vacancies_ccb_update" ON public.vacancies
    FOR UPDATE
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "vacancies_ccb_delete" ON public.vacancies;
CREATE POLICY "vacancies_ccb_delete" ON public.vacancies
    FOR DELETE
    USING (public.is_ccb_staff());

-- 3.7. Policies: talent_bank
DROP POLICY IF EXISTS "talent_bank_public_insert" ON public.talent_bank;
CREATE POLICY "talent_bank_public_insert" ON public.talent_bank
    FOR INSERT
    WITH CHECK (status = 'disponivel');

DROP POLICY IF EXISTS "talent_bank_ccb_manage" ON public.talent_bank;
CREATE POLICY "talent_bank_ccb_manage" ON public.talent_bank
    FOR ALL
    USING (public.is_ccb_staff() OR auth_user_id = auth.uid())
    WITH CHECK (public.is_ccb_staff() OR auth_user_id = auth.uid());

-- 3.8. Policies: candidates
DROP POLICY IF EXISTS "candidates_ccb_manage" ON public.candidates;
CREATE POLICY "candidates_ccb_manage" ON public.candidates
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "candidate_portal_public_read" ON public.candidates;
CREATE POLICY "candidate_portal_public_read" ON public.candidates
    FOR SELECT
    USING (
        document_token = NULLIF(current_setting('request.headers', true)::json->>'x-candidate-token', '')::uuid
        AND token_expires_at > timezone('utc'::text, now())
    );

DROP POLICY IF EXISTS "candidate_public_apply" ON public.candidates;
CREATE POLICY "candidate_public_apply" ON public.candidates
    FOR INSERT
    WITH CHECK (
        pipeline_stage = 'triagem'
        AND EXISTS (
            SELECT 1 FROM public.vacancies v
            WHERE v.id = vacancy_id AND v.tenant_id = tenant_id AND v.status = 'open'
        )
    );

-- 3.9. Policies: documents
DROP POLICY IF EXISTS "documents_ccb_manage" ON public.documents;
CREATE POLICY "documents_ccb_manage" ON public.documents
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "candidate_portal_documents_access" ON public.documents;
CREATE POLICY "candidate_portal_documents_access" ON public.documents
    FOR ALL
    USING (
        candidate_id IN (
            SELECT c.id FROM public.candidates c
            WHERE c.document_token = NULLIF(current_setting('request.headers', true)::json->>'x-candidate-token', '')::uuid
              AND c.token_expires_at > timezone('utc'::text, now())
        )
    )
    WITH CHECK (
        candidate_id IN (
            SELECT c.id FROM public.candidates c
            WHERE c.document_token = NULLIF(current_setting('request.headers', true)::json->>'x-candidate-token', '')::uuid
              AND c.token_expires_at > timezone('utc'::text, now())
        )
    );

-- 3.10. Policies: payroll_entries
DROP POLICY IF EXISTS "payroll_entries_ccb_manage" ON public.payroll_entries;
CREATE POLICY "payroll_entries_ccb_manage" ON public.payroll_entries
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- 3.10b. Policies: payroll_parameters
DROP POLICY IF EXISTS "payroll_parameters_ccb_manage" ON public.payroll_parameters;
CREATE POLICY "payroll_parameters_ccb_manage" ON public.payroll_parameters
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- 3.11. Policies: contact_leads
DROP POLICY IF EXISTS "contact_leads_public_insert" ON public.contact_leads;
CREATE POLICY "contact_leads_public_insert" ON public.contact_leads
    FOR INSERT
    WITH CHECK (status = 'novo');

DROP POLICY IF EXISTS "contact_leads_ccb_manage" ON public.contact_leads;
CREATE POLICY "contact_leads_ccb_manage" ON public.contact_leads
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- ============================================================================
-- 4. FUNÇÕES RPC ATÔMICAS DE NEGÓCIO E FLUXOS PÚBLICOS SEGUROS
-- ============================================================================

-- 4.1. Candidatura pública pelo Painel de Vagas (retorna token sem expor tabela candidates)
CREATE OR REPLACE FUNCTION public.submit_public_application(
    p_tenant_id UUID,
    p_vacancy_id UUID,
    p_full_name VARCHAR,
    p_email VARCHAR,
    p_phone VARCHAR,
    p_linkedin_url TEXT DEFAULT NULL,
    p_resume_path TEXT DEFAULT NULL,
    p_cep VARCHAR DEFAULT NULL,
    p_endereco VARCHAR DEFAULT NULL,
    p_numero VARCHAR DEFAULT NULL,
    p_complemento VARCHAR DEFAULT NULL,
    p_bairro VARCHAR DEFAULT NULL,
    p_cidade VARCHAR DEFAULT NULL,
    p_estado VARCHAR DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE(candidate_id UUID, document_token UUID, token_expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cand_id UUID := gen_random_uuid();
    v_token UUID := gen_random_uuid();
    v_exp TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now()) + interval '7 days';
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.vacancies v
        WHERE v.id = p_vacancy_id AND v.tenant_id = p_tenant_id AND v.status = 'open'
    ) THEN
        RAISE EXCEPTION 'Vaga não encontrada ou encerrada.';
    END IF;

    INSERT INTO public.candidates (
        id, tenant_id, vacancy_id, full_name, email, phone, linkedin_url, resume_path,
        cep, endereco, numero, complemento, bairro, cidade, estado, latitude, longitude,
        pipeline_stage, document_token, token_expires_at
    ) VALUES (
        v_cand_id, p_tenant_id, p_vacancy_id, p_full_name, p_email, p_phone, p_linkedin_url, p_resume_path,
        p_cep, p_endereco, p_numero, p_complemento, p_bairro, p_cidade, p_estado, p_latitude, p_longitude,
        'triagem', v_token, v_exp
    );

    IF p_resume_path IS NOT NULL AND length(trim(p_resume_path)) > 0 THEN
        INSERT INTO public.documents (
            tenant_id, candidate_id, document_type, storage_path, status
        ) VALUES (
            p_tenant_id, v_cand_id, 'Curriculo', p_resume_path, 'pending_review'
        );
    END IF;

    RETURN QUERY SELECT v_cand_id, v_token, v_exp;
END;
$$;

-- 4.2. Consulta do Portal Público do Candidato por token temporário
CREATE OR REPLACE FUNCTION public.get_candidate_portal_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cand RECORD;
    v_comp RECORD;
    v_docs JSONB;
BEGIN
    SELECT * INTO v_cand FROM public.candidates WHERE document_token = p_token;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT id, name, cnpj INTO v_comp FROM public.companies WHERE id = v_cand.tenant_id;

    SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.uploaded_at DESC), '[]'::jsonb)
    INTO v_docs
    FROM public.documents d
    WHERE d.candidate_id = v_cand.id;

    RETURN jsonb_build_object(
        'candidate', to_jsonb(v_cand),
        'company', to_jsonb(v_comp),
        'documents', v_docs
    );
END;
$$;

-- 4.3. Envio de documento pelo Portal Público do Candidato por token válido
CREATE OR REPLACE FUNCTION public.submit_candidate_document_by_token(
    p_token UUID,
    p_document_type VARCHAR,
    p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cand RECORD;
    v_doc RECORD;
BEGIN
    SELECT * INTO v_cand FROM public.candidates WHERE document_token = p_token;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token inválido.';
    END IF;

    IF v_cand.token_expires_at < timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'O link de autoenvio expirou. Solicite a renovação ao RH.';
    END IF;

    SELECT * INTO v_doc
    FROM public.documents
    WHERE candidate_id = v_cand.id
      AND tenant_id = v_cand.tenant_id
      AND document_type = p_document_type
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.documents
        SET storage_path = p_storage_path,
            status = 'pending_review',
            uploaded_at = timezone('utc'::text, now())
        WHERE id = v_doc.id
        RETURNING * INTO v_doc;
    ELSE
        INSERT INTO public.documents (
            tenant_id, employee_id, candidate_id, document_type, storage_path, status
        ) VALUES (
            v_cand.tenant_id, NULL, v_cand.id, p_document_type, p_storage_path, 'pending_review'
        )
        RETURNING * INTO v_doc;
    END IF;

    RETURN to_jsonb(v_doc);
END;
$$;

-- 4.4. Cadastro Público de Empresa + Filiais + Vagas (status pending_review)
CREATE OR REPLACE FUNCTION public.submit_public_company_registration(
    p_company JSONB,
    p_branches JSONB DEFAULT '[]'::jsonb,
    p_vacancies JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_comp_id UUID := gen_random_uuid();
    v_hq_branch_id UUID;
    v_clean_cnpj TEXT := regexp_replace(COALESCE(p_company->>'cnpj', ''), '\D', '', 'g');
    v_clean_root TEXT := left(v_clean_cnpj, 8);
    v_branch JSONB;
    v_vac JSONB;
    v_job_id UUID;
    v_salary NUMERIC;
BEGIN
    INSERT INTO public.companies (
        id, name, cnpj, cnpj_root, email, telefone, area_atuacao, porte, descricao,
        endereco, numero, complemento, bairro, cidade, estado, cep, tem_filiais,
        responsavel_nome, responsavel_cargo, beneficios, status
    ) VALUES (
        v_comp_id,
        p_company->>'nome',
        NULLIF(v_clean_cnpj, ''),
        NULLIF(v_clean_root, ''),
        p_company->>'email',
        p_company->>'telefone',
        p_company->>'area_atuacao',
        COALESCE(NULLIF(p_company->>'porte', ''), 'pequena'),
        p_company->>'descricao',
        p_company->>'endereco',
        p_company->>'numero',
        p_company->>'complemento',
        p_company->>'bairro',
        p_company->>'cidade',
        p_company->>'estado',
        p_company->>'cep',
        COALESCE((p_company->>'tem_filiais')::boolean, false),
        p_company->>'responsavel_nome',
        p_company->>'responsavel_cargo',
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_company->'beneficios')), '{}'::text[]),
        'pending_review'
    );

    IF length(v_clean_cnpj) = 14 THEN
        v_hq_branch_id := gen_random_uuid();
        INSERT INTO public.company_branches (
            id, company_id, label, cnpj, endereco, cidade, estado, cep, is_headquarters
        ) VALUES (
            v_hq_branch_id,
            v_comp_id,
            COALESCE('Matriz · ' || NULLIF(p_company->>'cidade', ''), 'Matriz'),
            v_clean_cnpj,
            p_company->>'endereco',
            p_company->>'cidade',
            p_company->>'estado',
            p_company->>'cep',
            true
        );
    END IF;

    FOR v_branch IN SELECT * FROM jsonb_array_elements(COALESCE(p_branches, '[]'::jsonb))
    LOOP
        IF length(trim(COALESCE(v_branch->>'cidade', '') || COALESCE(v_branch->>'endereco', ''))) > 0 THEN
            INSERT INTO public.company_branches (
                company_id, label, endereco, cidade, estado, cep, is_headquarters
            ) VALUES (
                v_comp_id,
                COALESCE('Filial · ' || NULLIF(v_branch->>'cidade', ''), 'Filial'),
                v_branch->>'endereco',
                v_branch->>'cidade',
                v_branch->>'estado',
                v_branch->>'cep',
                false
            );
        END IF;
    END LOOP;

    FOR v_vac IN SELECT * FROM jsonb_array_elements(COALESCE(p_vacancies, '[]'::jsonb))
    LOOP
        IF length(trim(COALESCE(v_vac->>'cargo', ''))) > 0 THEN
            v_salary := COALESCE(
                NULLIF(regexp_replace(replace(COALESCE(v_vac->>'salario', ''), ',', '.'), '[^0-9.]', '', 'g'), '')::numeric,
                3500
            );
            v_job_id := gen_random_uuid();
            INSERT INTO public.jobs (id, tenant_id, title, department, base_salary)
            VALUES (
                v_job_id,
                v_comp_id,
                trim(v_vac->>'cargo'),
                COALESCE(NULLIF(trim(v_vac->>'area'), ''), NULLIF(trim(p_company->>'area_atuacao'), ''), 'Operações'),
                v_salary
            );

            INSERT INTO public.vacancies (
                tenant_id, job_id, branch_id, title, area, description, requirements, salary, show_salary,
                vacancies_count, contract_type, work_mode, city, state, api_source, status
            ) VALUES (
                v_comp_id,
                v_job_id,
                v_hq_branch_id,
                trim(v_vac->>'cargo'),
                v_vac->>'area',
                COALESCE(NULLIF(trim(v_vac->>'descricao'), ''), 'Vaga cadastrada para ' || (p_company->>'nome')),
                v_vac->>'requisitos',
                v_salary,
                length(trim(COALESCE(v_vac->>'salario', ''))) > 0,
                GREATEST(COALESCE((v_vac->>'vagas_disponiveis')::int, 1), 1),
                COALESCE(NULLIF(v_vac->>'tipo_contratacao', ''), 'clt'),
                COALESCE(NULLIF(v_vac->>'regime', ''), 'presencial'),
                COALESCE(NULLIF(v_vac->>'cidade', ''), p_company->>'cidade'),
                COALESCE(NULLIF(v_vac->>'estado', ''), p_company->>'estado'),
                'company_form',
                'paused'
            );
        END IF;
    END LOOP;

    RETURN v_comp_id;
END;
$$;

-- 4.5. Aprovar e Ativar Empresa Cliente
CREATE OR REPLACE FUNCTION public.approve_registered_company(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_ccb_staff() THEN
        RAISE EXCEPTION 'Acesso exclusivo à equipe CCB.';
    END IF;

    UPDATE public.companies
    SET status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_company_id;

    UPDATE public.vacancies
    SET status = 'open'
    WHERE tenant_id = p_company_id
      AND api_source = 'company_form';
END;
$$;

-- 4.6. Conversão Atômica de Candidato para Colaborador
CREATE OR REPLACE FUNCTION public.promote_candidate_to_employee(
    p_tenant_id UUID,
    p_candidate_id UUID,
    p_reports_to UUID DEFAULT NULL,
    p_hire_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cand RECORD;
    v_vac RECORD;
    v_new_employee_id UUID := gen_random_uuid();
BEGIN
    IF NOT public.is_ccb_staff() THEN
        RAISE EXCEPTION 'Acesso exclusivo à equipe CCB.';
    END IF;

    SELECT * INTO v_cand
    FROM public.candidates
    WHERE id = p_candidate_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidato não encontrado para esta empresa cliente.';
    END IF;

    IF v_cand.pipeline_stage <> 'aprovado' THEN
        RAISE EXCEPTION 'Apenas candidatos na etapa "aprovado" podem ser admitidos.';
    END IF;

    SELECT * INTO v_vac
    FROM public.vacancies
    WHERE id = v_cand.vacancy_id AND tenant_id = p_tenant_id;

    IF v_vac.job_id IS NULL THEN
        RAISE EXCEPTION 'A vaga vinculada precisa estar associada a um cargo da tabela jobs desta empresa.';
    END IF;

    INSERT INTO public.employees (
        id, tenant_id, job_id, branch_id, reports_to, full_name, email, phone, status, hire_date
    ) VALUES (
        v_new_employee_id, p_tenant_id, v_vac.job_id, v_vac.branch_id, p_reports_to, v_cand.full_name, v_cand.email, v_cand.phone, 'active', p_hire_date
    );

    UPDATE public.documents
    SET employee_id = v_new_employee_id,
        candidate_id = NULL
    WHERE candidate_id = p_candidate_id
      AND tenant_id = p_tenant_id;

    IF v_cand.talent_id IS NOT NULL THEN
        UPDATE public.talent_bank
        SET status = 'contratado'
        WHERE id = v_cand.talent_id;
    END IF;

    DELETE FROM public.candidates
    WHERE id = p_candidate_id AND tenant_id = p_tenant_id;

    RETURN v_new_employee_id;
END;
$$;

-- 4.7. Reemissão de Token Temporário
CREATE OR REPLACE FUNCTION public.reissue_candidate_token(
    p_tenant_id UUID,
    p_candidate_id UUID
)
RETURNS TABLE(new_token UUID, new_expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token UUID := gen_random_uuid();
    v_exp TIMESTAMP WITH TIME ZONE := timezone('utc'::text, now()) + interval '7 days';
BEGIN
    IF NOT public.is_ccb_staff() THEN
        RAISE EXCEPTION 'Acesso exclusivo à equipe CCB.';
    END IF;

    UPDATE public.candidates
    SET document_token = v_token,
        token_expires_at = v_exp
    WHERE id = p_candidate_id AND tenant_id = p_tenant_id;

    RETURN QUERY SELECT v_token, v_exp;
END;
$$;

-- 4.8. Resumo Gerencial e Folha Salarial por Departamento
CREATE OR REPLACE FUNCTION public.get_tenant_payroll_summary(p_tenant_id UUID)
RETURNS TABLE(
    department VARCHAR,
    total_colaboradores BIGINT,
    ativos BIGINT,
    ferias BIGINT,
    folha_mensal NUMERIC,
    salario_medio NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        j.department,
        COUNT(e.id) AS total_colaboradores,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) AS ativos,
        COUNT(CASE WHEN e.status = 'vacation' THEN 1 END) AS ferias,
        ROUND(SUM(COALESCE(e.salary_override, j.base_salary)), 2) AS folha_mensal,
        ROUND(AVG(COALESCE(e.salary_override, j.base_salary)), 2) AS salario_medio
    FROM public.employees e
    JOIN public.jobs j ON e.job_id = j.id AND j.tenant_id = e.tenant_id
    WHERE e.tenant_id = p_tenant_id
      AND e.status IN ('active', 'vacation')
      AND public.is_ccb_staff()
    GROUP BY j.department
    ORDER BY folha_mensal DESC;
$$;

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKETS & POLÍTICAS DE ARQUIVOS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('ccbrh-docs', 'ccbrh-docs', false),
    ('ccbrh-resumes', 'ccbrh-resumes', false),
    ('ccbrh-company-assets', 'ccbrh-company-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ccbrh_docs_ccb_access" ON storage.objects;
CREATE POLICY "ccbrh_docs_ccb_access" ON storage.objects
    FOR ALL
    USING (bucket_id = 'ccbrh-docs' AND public.is_ccb_staff())
    WITH CHECK (bucket_id = 'ccbrh-docs' AND public.is_ccb_staff());

DROP POLICY IF EXISTS "ccbrh_docs_candidate_portal_upload" ON storage.objects;
CREATE POLICY "ccbrh_docs_candidate_portal_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ccbrh-docs' AND name LIKE 'portal/%');

DROP POLICY IF EXISTS "ccbrh_resumes_upload_public" ON storage.objects;
CREATE POLICY "ccbrh_resumes_upload_public" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ccbrh-resumes');

DROP POLICY IF EXISTS "ccbrh_resumes_read_ccb" ON storage.objects;
CREATE POLICY "ccbrh_resumes_read_ccb" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ccbrh-resumes' AND public.is_ccb_staff());

DROP POLICY IF EXISTS "ccbrh_company_assets_upload" ON storage.objects;
CREATE POLICY "ccbrh_company_assets_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ccbrh-company-assets');

DROP POLICY IF EXISTS "ccbrh_company_assets_read" ON storage.objects;
CREATE POLICY "ccbrh_company_assets_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ccbrh-company-assets');
