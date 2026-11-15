export const SUPABASE_DDL_SCHEMA = `-- ==========================================================
-- CCBRH SAAS - SUPABASE / POSTGRESQL COMPLETE ARCHITECTURE
-- MULTI-TENANT ISOLATION WITH ROW LEVEL SECURITY (RLS)
-- ==========================================================

-- 1. Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela: companies (Tenants & Cadastro Comercial)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: company_branches (Matriz e Filiais de Empresas)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: user_profiles (Contas EXCLUSIVAS da equipe interna CCB via Supabase Auth)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'consultor_rh' CHECK (role IN ('diretoria_ccb', 'consultor_rh', 'analista_dp')),
    role_label VARCHAR(120) NOT NULL DEFAULT 'Consultor(a) de RH · CCB',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela: jobs (Cargos e Salários isolados por empresa cliente)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON public.jobs(tenant_id);

-- 5. Tabela: employees (Funcionários Ativos e Histórico/Organograma)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON public.employees(reports_to);

-- 6. Tabela: vacancies (Vagas publicadas internamente, via APIs ou Cadastro de Empresa)
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
    vacancies_count INTEGER NOT NULL DEFAULT 1,
    contract_type VARCHAR(30) NOT NULL DEFAULT 'clt' CHECK (contract_type IN ('clt', 'pj', 'temporario', 'estagio')),
    work_mode VARCHAR(30) NOT NULL DEFAULT 'presencial' CHECK (work_mode IN ('presencial', 'hibrido', 'remoto')),
    city VARCHAR(120),
    state VARCHAR(50),
    api_source VARCHAR(100) NOT NULL DEFAULT 'internal' CHECK (api_source IN ('internal', 'linkedin', 'indeed', 'company_form')),
    api_external_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paused')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vacancies_tenant ON public.vacancies(tenant_id);

-- 7. Tabela: talent_bank (Banco de Talentos CCB - /cadastro-talento)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela: candidates (Candidatos no Pipeline e Link de Autoenvio)
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
    document_token UUID UNIQUE DEFAULT gen_random_uuid(),
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidates_tenant ON public.candidates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_token ON public.candidates(document_token);

-- 9. Tabela: documents (Repositório unificado de arquivos)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('RG', 'CPF', 'Comprovante_Residencia', 'Curriculo')),
    storage_path TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_document_owner CHECK (
        (employee_id IS NOT NULL AND candidate_id IS NULL) OR
        (employee_id IS NULL AND candidate_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_candidate ON public.documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON public.documents(employee_id);

-- 10. Tabela: contact_leads (Solicitações comerciais da Landing Page)
CREATE TABLE IF NOT EXISTS public.contact_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_atendimento', 'concluido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
`;

export const SUPABASE_RLS_POLICIES = `-- ==========================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) SUPABASE - CCBRH
-- SaaS exclusivo da equipe CCB gerenciando dados isolados por empresa cliente
-- Arquivo completo executável em /supabase/schema.sql
-- ==========================================================

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

-- Acesso administrativo exclusivo da equipe CCB às tabelas operacionais:
CREATE POLICY "ccb_staff_jobs_manage" ON public.jobs
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

CREATE POLICY "ccb_staff_employees_manage" ON public.employees
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

CREATE POLICY "candidates_ccb_manage" ON public.candidates
    FOR ALL
    USING (public.is_ccb_staff())
    WITH CHECK (public.is_ccb_staff());

-- Acesso público controlado pelo Portal do Candidato via token não expirado:
CREATE POLICY "candidate_portal_public_read" ON public.candidates
    FOR SELECT
    USING (
        document_token = NULLIF(current_setting('request.headers', true)::json->>'x-candidate-token', '')::uuid
        AND token_expires_at > timezone('utc'::text, now())
    );
`;

export const ONBOARDING_SQL_TRANSACTION = (
  tenantId: string,
  candidateId: string,
  reportsTo: string | null,
  hireDate: string
) => `-- ==========================================================
-- SCRIPT DE CONVERSÃO AUTOMÁTICA (ONBOARDING ATÔMICO)
-- Move o candidato para funcionários e migra o repositório de documentos
-- Tenant ID: ${tenantId}
-- Candidate ID: ${candidateId}
-- ==========================================================

BEGIN TRANSACTION;

DO $$
DECLARE
    v_tenant_id UUID := '${tenantId}'::uuid;
    v_candidate_id UUID := '${candidateId}'::uuid;
    v_reports_to UUID := ${reportsTo ? `'${reportsTo}'::uuid` : 'NULL'};
    v_hire_date DATE := '${hireDate}'::date;
    
    v_cand RECORD;
    v_vac RECORD;
    v_new_employee_id UUID := gen_random_uuid();
    v_docs_count INT;
BEGIN
    -- 1. Obter e validar dados do candidato com isolamento RLS
    SELECT * INTO v_cand
    FROM public.candidates
    WHERE id = v_candidate_id AND tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidato não encontrado para este Tenant (%)!', v_tenant_id;
    END IF;

    IF v_cand.pipeline_stage != 'aprovado' THEN
        RAISE EXCEPTION 'Apenas candidatos no estágio "aprovado" podem ser contratados. Status atual: %', v_cand.pipeline_stage;
    END IF;

    -- 2. Obter job_id associado à vaga
    SELECT * INTO v_vac
    FROM public.vacancies
    WHERE id = v_cand.vacancy_id AND tenant_id = v_tenant_id;

    -- 3. Inserir na tabela employees (Ativação e Organograma)
    INSERT INTO public.employees (
        id,
        tenant_id,
        job_id,
        reports_to,
        full_name,
        email,
        status,
        hire_date,
        resignation_date,
        created_at
    ) VALUES (
        v_new_employee_id,
        v_tenant_id,
        v_vac.job_id,
        v_reports_to,
        v_cand.full_name,
        v_cand.email,
        'active',
        v_hire_date,
        NULL,
        timezone('utc'::text, now())
    );

    -- 4. Transferir documentos da tabela documents
    -- Desvincula candidate_id e associa ao novo employee_id
    UPDATE public.documents
    SET
        employee_id = v_new_employee_id,
        candidate_id = NULL
    WHERE candidate_id = v_candidate_id
      AND tenant_id = v_tenant_id;

    GET DIAGNOSTICS v_docs_count = ROW_COUNT;

    -- 5. Atualizar ou arquivar registro do candidato no pipeline
    DELETE FROM public.candidates
    WHERE id = v_candidate_id AND tenant_id = v_tenant_id;

    RAISE NOTICE 'Onboarding concluído com sucesso! Novo Funcionário: % | Documentos transferidos: %', v_new_employee_id, v_docs_count;
END $$;

COMMIT;
`;

export const PEOPLE_ANALYTICS_SQL = (tenantId: string) => `-- ==========================================================
-- RELATÓRIO EXECUTIVO: MASSA SALARIAL & HEADCOUNT POR DEPARTAMENTO
-- Tenant ID: ${tenantId}
-- ==========================================================
SELECT
    j.department,
    COUNT(e.id) AS total_headcount,
    COUNT(CASE WHEN e.status = 'active' THEN 1 END) AS active_headcount,
    COUNT(CASE WHEN e.status = 'vacation' THEN 1 END) AS on_vacation_headcount,
    ROUND(SUM(j.base_salary), 2) AS folha_salarial_mensal,
    ROUND(AVG(j.base_salary), 2) AS salario_medio,
    ROUND(MIN(j.base_salary), 2) AS salario_minimo,
    ROUND(MAX(j.base_salary), 2) AS salario_maximo
FROM public.employees e
JOIN public.jobs j ON e.job_id = j.id AND j.tenant_id = e.tenant_id
WHERE e.tenant_id = '${tenantId}'::uuid
  AND e.status IN ('active', 'vacation')
GROUP BY j.department
ORDER BY folha_salarial_mensal DESC;
`;

export const SALARY_DISTORTION_SQL = (tenantId: string) => `-- ==========================================================
-- AUDITORIA DE ANOMALIAS E DISPARIDADES SALARIAIS
-- Identifica distorções em relação à média do departamento
-- Tenant ID: ${tenantId}
-- ==========================================================
WITH DeptStats AS (
    SELECT
        j.department,
        AVG(j.base_salary) AS dept_avg_salary,
        STDDEV(j.base_salary) AS dept_stddev_salary,
        COUNT(e.id) AS dept_size
    FROM public.employees e
    JOIN public.jobs j ON e.job_id = j.id AND j.tenant_id = e.tenant_id
    WHERE e.tenant_id = '${tenantId}'::uuid AND e.status = 'active'
    GROUP BY j.department
)
SELECT
    e.id AS employee_id,
    e.full_name,
    j.title,
    j.department,
    j.base_salary,
    ROUND(ds.dept_avg_salary, 2) AS media_departamento,
    ROUND((j.base_salary - ds.dept_avg_salary), 2) AS diferenca_absoluta,
    ROUND(((j.base_salary - ds.dept_avg_salary) / NULLIF(ds.dept_avg_salary, 0)) * 100, 1) AS percentual_variacao
FROM public.employees e
JOIN public.jobs j ON e.job_id = j.id AND j.tenant_id = e.tenant_id
JOIN DeptStats ds ON j.department = ds.department
WHERE e.tenant_id = '${tenantId}'::uuid
  AND e.status = 'active'
ORDER BY ABS(j.base_salary - ds.dept_avg_salary) DESC;
`;

export const CANDIDATE_DOCUMENT_AUDIT_SQL = (tenantId: string) => `-- ==========================================================
-- AUDITORIA DO PIPELINE DE DOCUMENTOS & STATUS DE TOKENS
-- Identifica candidatos em 'aprovado' ou 'proposta' com pendências ou links expirados
-- Tenant ID: ${tenantId}
-- ==========================================================
SELECT
    c.id AS candidate_id,
    c.full_name,
    c.pipeline_stage,
    v.title AS vaga_titulo,
    c.document_token,
    c.token_expires_at,
    CASE 
        WHEN c.token_expires_at < now() THEN 'EXPIRADO (Ação: Reemitir Token)'
        ELSE 'VÁLIDO'
    END AS status_token,
    COUNT(d.id) AS total_documentos_enviados,
    COUNT(CASE WHEN d.status = 'approved' THEN 1 END) AS docs_aprovados,
    COUNT(CASE WHEN d.status = 'pending_review' THEN 1 END) AS docs_pendentes_revisao,
    COUNT(CASE WHEN d.status = 'rejected' THEN 1 END) AS docs_rejeitados,
    -- Validação dos 4 documentos obrigatórios
    ARRAY_REMOVE(ARRAY[
        CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d2 WHERE d2.candidate_id = c.id AND d2.document_type = 'RG') THEN 'RG' END,
        CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d2 WHERE d2.candidate_id = c.id AND d2.document_type = 'CPF') THEN 'CPF' END,
        CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d2 WHERE d2.candidate_id = c.id AND d2.document_type = 'Comprovante_Residencia') THEN 'Comprovante_Residencia' END,
        CASE WHEN NOT EXISTS (SELECT 1 FROM public.documents d2 WHERE d2.candidate_id = c.id AND d2.document_type = 'Curriculo') THEN 'Curriculo' END
    ], NULL) AS documentos_faltantes
FROM public.candidates c
JOIN public.vacancies v ON c.vacancy_id = v.id AND v.tenant_id = c.tenant_id
LEFT JOIN public.documents d ON d.candidate_id = c.id AND d.tenant_id = c.tenant_id
WHERE c.tenant_id = '${tenantId}'::uuid
  AND c.pipeline_stage IN ('proposta', 'aprovado')
GROUP BY c.id, c.full_name, c.pipeline_stage, v.title, c.document_token, c.token_expires_at
ORDER BY c.pipeline_stage DESC, c.token_expires_at ASC;
`;
