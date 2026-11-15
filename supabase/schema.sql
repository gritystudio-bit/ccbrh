-- ============================================================================
-- CCBRH SAAS - ESQUEMA COMPLETO PARA SUPABASE (POSTGRESQL + RLS + STORAGE)
-- ============================================================================
-- Modelo Operacional:
--   - SaaS EXCLUSIVO da equipe interna da CCB Soluções em RH.
--   - A CCB gerencia múltiplas empresas clientes cadastradas (tenants).
--   - Cada empresa cadastrada mantém seus dados, cargos, colaboradores, folha
--     de pagamento, vagas, candidatos e documentos isolados por tenant_id.
-- ============================================================================
-- Execute este script integralmente no SQL Editor do seu projeto Supabase
-- antes de realizar a hospedagem da plataforma ccbrh.
-- Script idempotente: seguro para execução inicial e reexecuções controladas.
-- ============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABELAS PRINCIPAIS (MULTI-EMPRESA GERENCIADA PELA CCB + PORTAL PÚBLICO)
-- ============================================================================

-- 2.1. companies (Empresas Clientes Cadastradas / Tenants gerenciados pela CCB)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    cnpj_root VARCHAR(10), -- Raiz do CNPJ (8 primeiros dígitos) quando a empresa possui matriz e filiais
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

-- 2.2. company_branches (Matriz e Filiais vinculadas à empresa cliente)
CREATE TABLE IF NOT EXISTS public.company_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    label VARCHAR(150) NOT NULL DEFAULT 'Unidade',
    cnpj VARCHAR(18) UNIQUE,
    endereco VARCHAR(255),
    cidade VARCHAR(120),
    estado VARCHAR(50),
    cep VARCHAR(20),
    is_headquarters BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_company_branches_company ON public.company_branches(company_id);

-- 2.3. user_profiles (Contas EXCLUSIVAS da equipe interna CCB via Supabase Auth)
-- Clientes externos NÃO possuem acesso de login ao SaaS; apenas consultores/diretoria CCB.
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'consultor_rh' CHECK (role IN ('diretoria_ccb', 'consultor_rh', 'analista_dp')),
    role_label VARCHAR(120) NOT NULL DEFAULT 'Consultor(a) de RH · CCB',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4. jobs (Cargos e Salários isolados por empresa cliente)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON public.jobs(tenant_id);

-- 2.5. employees (Colaboradores Ativos, Férias, Desligados e Organograma de cada empresa)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.company_branches(id) ON DELETE SET NULL,
    reports_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation')),
    hire_date DATE NOT NULL,
    resignation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_job ON public.employees(job_id);
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON public.employees(reports_to);

-- 2.6. vacancies (Vagas isoladas por empresa cliente e unidade/filial)
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

-- 2.7. talent_bank (Currículos cadastrados em /cadastro-talento - Banco de Talentos CCB)
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

-- 2.8. candidates (Candidatos no Pipeline de R&S de cada empresa + Token de Autoenvio)
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
    pipeline_stage VARCHAR(100) NOT NULL DEFAULT 'triagem' CHECK (pipeline_stage IN ('triagem', 'entrevista', 'proposta', 'aprovado')),
    document_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON public.candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_vacancy ON public.candidates(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_candidates_token ON public.candidates(document_token);

-- 2.9. documents (Repositório Unificado de Documentos isolado por empresa cliente)
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

-- 2.10. contact_leads (Mensagens comerciais enviadas pelo formulário da Landing Page)
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
-- 3. FUNÇÃO DE SEGURANÇA DO SAAS EXCLUSIVO CCB (RLS HELPER)
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

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
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
ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

-- 4.1. Policies: companies
DROP POLICY IF EXISTS "companies_ccb_manage" ON public.companies;
CREATE POLICY "companies_ccb_manage" ON public.companies
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "companies_public_insert_pending" ON public.companies;
CREATE POLICY "companies_public_insert_pending" ON public.companies
    FOR INSERT
    WITH CHECK (status = 'pending_review');

-- 4.2. Policies: company_branches
DROP POLICY IF EXISTS "branches_ccb_manage" ON public.company_branches;
CREATE POLICY "branches_ccb_manage" ON public.company_branches
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

DROP POLICY IF EXISTS "branches_public_insert" ON public.company_branches;
CREATE POLICY "branches_public_insert" ON public.company_branches
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = company_id AND c.status = 'pending_review'
        )
    );

-- 4.3. Policies: user_profiles (Acesso restrito exclusivamente à equipe CCB)
DROP POLICY IF EXISTS "profiles_self_or_ccb_select" ON public.user_profiles;
CREATE POLICY "profiles_self_or_ccb_select" ON public.user_profiles
    FOR SELECT
    USING (id = auth.uid() OR public.is_ccb_staff());

DROP POLICY IF EXISTS "profiles_diretoria_manage" ON public.user_profiles;
CREATE POLICY "profiles_diretoria_manage" ON public.user_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'diretoria_ccb' AND up.is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid() AND up.role = 'diretoria_ccb' AND up.is_active = true
        )
    );

-- 4.4. Policies: jobs
DROP POLICY IF EXISTS "ccb_staff_jobs_manage" ON public.jobs;
CREATE POLICY "ccb_staff_jobs_manage" ON public.jobs
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- 4.5. Policies: employees
DROP POLICY IF EXISTS "ccb_staff_employees_manage" ON public.employees;
CREATE POLICY "ccb_staff_employees_manage" ON public.employees
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- 4.6. Policies: vacancies
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

-- 4.7. Policies: talent_bank
DROP POLICY IF EXISTS "talent_bank_public_insert" ON public.talent_bank;
CREATE POLICY "talent_bank_public_insert" ON public.talent_bank
    FOR INSERT
    WITH CHECK (status = 'disponivel');

DROP POLICY IF EXISTS "talent_bank_ccb_manage" ON public.talent_bank;
CREATE POLICY "talent_bank_ccb_manage" ON public.talent_bank
    FOR ALL
    USING (public.is_ccb_staff() OR auth_user_id = auth.uid())
    WITH CHECK (public.is_ccb_staff() OR auth_user_id = auth.uid());

-- 4.8. Policies: candidates
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

-- 4.9. Policies: documents
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

-- 4.10. Policies: contact_leads
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
-- 5. FUNÇÕES RPC ATÔMICAS DE NEGÓCIO (CCB MULTI-EMPRESA)
-- ============================================================================

-- 5.1. Aprovar e Ativar Empresa Cliente Cadastrada pelo Portal Público
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

-- 5.2. Conversão Atômica de Candidato para Colaborador na Empresa Cliente Selecionada
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
        id, tenant_id, job_id, reports_to, full_name, email, status, hire_date
    ) VALUES (
        v_new_employee_id, p_tenant_id, v_vac.job_id, p_reports_to, v_cand.full_name, v_cand.email, 'active', p_hire_date
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

-- 5.3. Reemissão de Token Temporário (Prorrogação por +7 dias)
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

-- 5.4. Resumo Gerencial e Folha Salarial por Departamento da Empresa Cliente Selecionada
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
        ROUND(SUM(j.base_salary), 2) AS folha_mensal,
        ROUND(AVG(j.base_salary), 2) AS salario_medio
    FROM public.employees e
    JOIN public.jobs j ON e.job_id = j.id AND j.tenant_id = e.tenant_id
    WHERE e.tenant_id = p_tenant_id
      AND e.status IN ('active', 'vacation')
      AND public.is_ccb_staff()
    GROUP BY j.department
    ORDER BY folha_mensal DESC;
$$;

-- ============================================================================
-- 6. SUPABASE STORAGE BUCKETS & POLÍTICAS DE ARQUIVOS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('ccbrh-docs', 'ccbrh-docs', false),
    ('ccbrh-resumes', 'ccbrh-resumes', false),
    ('ccbrh-company-assets', 'ccbrh-company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Documentos de Admissão / Colaboradores (bucket privado ccbrh-docs - acesso exclusivo CCB)
DROP POLICY IF EXISTS "ccbrh_docs_ccb_access" ON storage.objects;
CREATE POLICY "ccbrh_docs_ccb_access" ON storage.objects
    FOR ALL
    USING (bucket_id = 'ccbrh-docs' AND public.is_ccb_staff())
    WITH CHECK (bucket_id = 'ccbrh-docs' AND public.is_ccb_staff());

-- Currículos do Banco de Talentos (bucket privado ccbrh-resumes - envio público, leitura exclusiva CCB)
DROP POLICY IF EXISTS "ccbrh_resumes_upload_public" ON storage.objects;
CREATE POLICY "ccbrh_resumes_upload_public" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ccbrh-resumes');

DROP POLICY IF EXISTS "ccbrh_resumes_read_ccb" ON storage.objects;
CREATE POLICY "ccbrh_resumes_read_ccb" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ccbrh-resumes' AND public.is_ccb_staff());

-- Ativos Institucionais de Empresas (Logotipos / Regulamentos / Código de Conduta)
DROP POLICY IF EXISTS "ccbrh_company_assets_upload" ON storage.objects;
CREATE POLICY "ccbrh_company_assets_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ccbrh-company-assets');

DROP POLICY IF EXISTS "ccbrh_company_assets_read" ON storage.objects;
CREATE POLICY "ccbrh_company_assets_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ccbrh-company-assets');
