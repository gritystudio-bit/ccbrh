-- ============================================================================
-- CCBRH SAAS — MÓDULO DE SUPORTE E PORTAL ADMINISTRATIVO (/admin)
-- Migration Idempotente (PostgreSQL / Supabase + RLS Fail-Closed + RPCs)
-- ============================================================================
-- Compatível com o schema existente do CCBRH (companies, user_profiles,
-- employees, vacancies, candidates, documents, payroll_entries, storage.buckets).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TRIGGER HELPER REUTILIZÁVEL PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. AUTORIZAÇÃO ADMINISTRATIVA (is_superadmin + is_admin())
-- ============================================================================

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now());

-- Função central de verificação de superadmin (Fail-Closed)
CREATE OR REPLACE FUNCTION public.is_admin()
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
          AND is_superadmin = true
    );
$$;

-- Garante que nenhum usuário comum consiga promover a si mesmo (ou terceiros)
-- para is_superadmin via UPDATE na tabela user_profiles.
CREATE OR REPLACE FUNCTION public.protect_user_profile_superadmin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_superadmin IS TRUE AND auth.uid() IS NOT NULL AND NOT coalesce(public.is_admin(), false) THEN
            RAISE EXCEPTION 'Operação não permitida: apenas superadministradores podem definir is_superadmin.'
                USING ERRCODE = '42501';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin
           AND auth.uid() IS NOT NULL
           AND NOT coalesce(public.is_admin(), false) THEN
            RAISE EXCEPTION 'Operação não permitida: flag is_superadmin não é editável pelo usuário.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_profile_superadmin ON public.user_profiles;
CREATE TRIGGER trg_protect_user_profile_superadmin
    BEFORE INSERT OR UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_user_profile_superadmin();

DROP POLICY IF EXISTS "profiles_superadmin_manage" ON public.user_profiles;
CREATE POLICY "profiles_superadmin_manage" ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- 3. TABELA DE SOLICITAÇÕES DE SUPORTE (public.suporte_solicitacoes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suporte_solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('melhoria', 'bug', 'funcionalidade')),
    titulo TEXT NOT NULL CHECK (char_length(trim(titulo)) BETWEEN 3 AND 120),
    descricao TEXT NOT NULL CHECK (char_length(trim(descricao)) BETWEEN 10 AND 4000),
    status TEXT NOT NULL DEFAULT 'aberto'
        CHECK (status IN ('aberto', 'em_analise', 'planejado', 'resolvido', 'descartado')),
    resposta_equipe TEXT,
    plan_tier TEXT,
    contexto JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_suporte_solicitacoes_user_created
    ON public.suporte_solicitacoes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suporte_solicitacoes_status_created
    ON public.suporte_solicitacoes (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_suporte_solicitacoes_updated_at ON public.suporte_solicitacoes;
CREATE TRIGGER trg_suporte_solicitacoes_updated_at
    BEFORE UPDATE ON public.suporte_solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.suporte_solicitacoes ENABLE ROW LEVEL SECURITY;

-- Fail-Closed: anon sem acesso algum
REVOKE ALL ON public.suporte_solicitacoes FROM anon;
REVOKE ALL ON public.suporte_solicitacoes FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.suporte_solicitacoes TO authenticated;

DROP POLICY IF EXISTS "suporte_select_own_or_admin" ON public.suporte_solicitacoes;
CREATE POLICY "suporte_select_own_or_admin" ON public.suporte_solicitacoes
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "suporte_insert_own_open" ON public.suporte_solicitacoes;
CREATE POLICY "suporte_insert_own_open" ON public.suporte_solicitacoes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'aberto'
        AND resposta_equipe IS NULL
    );

DROP POLICY IF EXISTS "suporte_update_admin_only" ON public.suporte_solicitacoes;
CREATE POLICY "suporte_update_admin_only" ON public.suporte_solicitacoes
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ============================================================================
-- 4. TABELAS DE APOIO ADMINISTRATIVO
-- ============================================================================

-- 4.1. Feature Flags & Parâmetros Globais
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT false,
    regras JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_flags FROM anon;
REVOKE ALL ON public.feature_flags FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flags TO authenticated;

DROP POLICY IF EXISTS "feature_flags_authenticated_read" ON public.feature_flags;
CREATE POLICY "feature_flags_authenticated_read" ON public.feature_flags
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "feature_flags_admin_write" ON public.feature_flags;
CREATE POLICY "feature_flags_admin_write" ON public.feature_flags
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

INSERT INTO public.feature_flags (id, nome, descricao, ativo, regras)
VALUES
    ('maintenance_mode', 'Modo de Manutenção', 'Exibe tela de manutenção programada para usuários do SaaS (nunca bloqueia /admin).', false, '{"message": "Estamos realizando uma manutenção programada para melhorar a plataforma CCBRH. Voltamos em breve."}'::jsonb),
    ('support_module_enabled', 'Módulo de Suporte ao Usuário', 'Habilita abertura de solicitações de melhoria, bugs e novas funcionalidades no menu lateral.', true, '{}'::jsonb),
    ('ai_people_analytics', 'Motor de IA People Analytics', 'Habilita análises assistidas por IA nos indicadores gerenciais e folha.', true, '{}'::jsonb),
    ('payslip_email_dispatch', 'Disparo de Holerites via E-mail', 'Habilita o envio em lote de demonstrativos CLT e autorizações PJ via Resend.', true, '{}'::jsonb),
    ('public_company_registration', 'Cadastro Público de Empresas', 'Permite que novas empresas enviem solicitação de cadastro pelo portal público.', true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Função pública segura para checar apenas o status de manutenção (sem vazar demais flags)
CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT jsonb_build_object(
                'enabled', ativo,
                'message', COALESCE(regras->>'message', 'Sistema em manutenção programada. Voltamos em instantes.'),
                'updated_at', updated_at
            )
            FROM public.feature_flags
            WHERE id = 'maintenance_mode'
            LIMIT 1
        ),
        jsonb_build_object('enabled', false, 'message', NULL, 'updated_at', NULL)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_maintenance_status() TO anon, authenticated;

-- 4.2. Assinaturas / Planos por Empresa Cliente (Tenant)
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL DEFAULT 'essencial'
        CHECK (plan_tier IN ('essencial', 'profissional', 'enterprise', 'custom')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'pending')),
    monthly_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monthly_value >= 0),
    gateway TEXT NOT NULL DEFAULT 'manual'
        CHECK (gateway IN ('manual', 'stripe', 'asaas', 'mercadopago')),
    external_customer_id TEXT,
    external_subscription_id TEXT,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    storage_quota_mb INTEGER NOT NULL DEFAULT 1024 CHECK (storage_quota_mb > 0),
    max_employees INTEGER NOT NULL DEFAULT 100 CHECK (max_employees > 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON public.tenant_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_gateway ON public.tenant_subscriptions(gateway);

DROP TRIGGER IF EXISTS trg_tenant_subscriptions_updated_at ON public.tenant_subscriptions;
CREATE TRIGGER trg_tenant_subscriptions_updated_at
    BEFORE UPDATE ON public.tenant_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_subscriptions FROM anon;
REVOKE ALL ON public.tenant_subscriptions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_subscriptions TO authenticated;

DROP POLICY IF EXISTS "tenant_subscriptions_admin_all" ON public.tenant_subscriptions;
CREATE POLICY "tenant_subscriptions_admin_all" ON public.tenant_subscriptions
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4.3. Cupons Promocionais de Billing
CREATE TABLE IF NOT EXISTS public.billing_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (char_length(trim(code)) BETWEEN 3 AND 40),
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    redemptions_count INTEGER NOT NULL DEFAULT 0 CHECK (redemptions_count >= 0),
    valid_until TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT true,
    gateway TEXT NOT NULL DEFAULT 'manual'
        CHECK (gateway IN ('manual', 'stripe', 'asaas', 'mercadopago')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_billing_coupons_updated_at ON public.billing_coupons;
CREATE TRIGGER trg_billing_coupons_updated_at
    BEFORE UPDATE ON public.billing_coupons
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_coupons FROM anon;
REVOKE ALL ON public.billing_coupons FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_coupons TO authenticated;

DROP POLICY IF EXISTS "billing_coupons_admin_all" ON public.billing_coupons;
CREATE POLICY "billing_coupons_admin_all" ON public.billing_coupons
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4.4. Logs de Webhooks de Gateways de Pagamento
CREATE TABLE IF NOT EXISTS public.billing_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'asaas', 'mercadopago', 'resend', 'manual')),
    event_type TEXT NOT NULL,
    external_event_id TEXT,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
    http_status INTEGER,
    error_message TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_billing_webhook_logs_created
    ON public.billing_webhook_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_logs_provider_status
    ON public.billing_webhook_logs (provider, status);

ALTER TABLE public.billing_webhook_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_webhook_logs FROM anon;
REVOKE ALL ON public.billing_webhook_logs FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.billing_webhook_logs TO authenticated;

DROP POLICY IF EXISTS "billing_webhook_logs_admin_all" ON public.billing_webhook_logs;
CREATE POLICY "billing_webhook_logs_admin_all" ON public.billing_webhook_logs
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 4.5. Templates e Campanhas de E-mail Marketing
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
    nome TEXT NOT NULL,
    assunto TEXT NOT NULL,
    corpo_html TEXT NOT NULL,
    variaveis TEXT[] NOT NULL DEFAULT ARRAY['nome', 'email', 'empresa'],
    categoria TEXT NOT NULL DEFAULT 'comunicado'
        CHECK (categoria IN ('onboarding', 'comunicado', 'novidades', 'billing', 'suporte')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_templates FROM anon;
REVOKE ALL ON public.email_templates FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;

DROP POLICY IF EXISTS "email_templates_admin_all" ON public.email_templates;
CREATE POLICY "email_templates_admin_all" ON public.email_templates
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    assunto TEXT NOT NULL,
    corpo_html TEXT NOT NULL,
    segmento TEXT NOT NULL DEFAULT 'todos_usuarios'
        CHECK (segmento IN ('todos_usuarios', 'equipe_ccb', 'empresas_ativas', 'empresas_pendentes', 'leads_comerciais')),
    status TEXT NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'enviando', 'enviada', 'falha', 'simulada')),
    total_destinatarios INTEGER NOT NULL DEFAULT 0,
    enviados INTEGER NOT NULL DEFAULT 0,
    falhas INTEGER NOT NULL DEFAULT 0,
    erro_detalhe TEXT,
    enviado_em TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON public.email_campaigns(created_at DESC);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_campaigns FROM anon;
REVOKE ALL ON public.email_campaigns FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;

DROP POLICY IF EXISTS "email_campaigns_admin_all" ON public.email_campaigns;
CREATE POLICY "email_campaigns_admin_all" ON public.email_campaigns
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

INSERT INTO public.email_templates (slug, nome, assunto, corpo_html, variaveis, categoria)
VALUES (
    'boas-vindas-ccbrh',
    'Boas-vindas CCBRH',
    'Bem-vindo(a) à plataforma CCBRH, {{nome}}!',
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="background:#082175;color:#ffffff;padding:24px;"><h1 style="margin:0;font-size:20px;">CCBRH · Soluções em RH</h1><p style="margin:6px 0 0;color:#f5a90e;font-size:13px;">Gestão de Pessoas, Recrutamento e DP</p></div><div style="padding:24px;color:#0f172a;font-size:14px;line-height:1.6;"><p>Olá, <strong>{{nome}}</strong>,</p><p>Seu acesso corporativo na plataforma <strong>CCBRH</strong> ({{empresa}}) está ativo. Agora você pode acompanhar indicadores, vagas, admissões e folha com total conformidade LGPD.</p><p style="margin-top:20px;color:#475569;font-size:12px;">Equipe CCB Soluções em RH · contato@ccbrh.com.br</p></div></div>',
    ARRAY['nome', 'email', 'empresa'],
    'onboarding'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 5. RPCs ADMINISTRATIVAS (SECURITY DEFINER + VERIFICAÇÃO ESTRITA is_admin())
-- ============================================================================

-- 5.1. Métricas Consolidadas do Dashboard Admin
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_users BIGINT := 0;
    v_new_users_30d BIGINT := 0;
    v_total_companies BIGINT := 0;
    v_active_companies BIGINT := 0;
    v_active_subs BIGINT := 0;
    v_trial_subs BIGINT := 0;
    v_canceled_subs BIGINT := 0;
    v_mrr NUMERIC(12,2) := 0;
    v_open_tickets BIGINT := 0;
    v_total_tickets BIGINT := 0;
    v_failed_webhooks BIGINT := 0;
    v_failed_webhooks_24h BIGINT := 0;
    v_total_employees BIGINT := 0;
    v_open_vacancies BIGINT := 0;
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso negado: privilégio de superadministrador obrigatório.'
            USING ERRCODE = '42501';
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE created_at >= timezone('utc'::text, now()) - interval '30 days')
    INTO v_total_users, v_new_users_30d
    FROM public.user_profiles;

    SELECT count(*),
           count(*) FILTER (WHERE status = 'active')
    INTO v_total_companies, v_active_companies
    FROM public.companies;

    SELECT
        count(*) FILTER (WHERE status = 'active'),
        count(*) FILTER (WHERE status = 'trial'),
        count(*) FILTER (WHERE status = 'canceled'),
        COALESCE(SUM(monthly_value) FILTER (WHERE status = 'active'), 0)
    INTO v_active_subs, v_trial_subs, v_canceled_subs, v_mrr
    FROM public.tenant_subscriptions;

    SELECT
        count(*) FILTER (WHERE status IN ('aberto', 'em_analise')),
        count(*)
    INTO v_open_tickets, v_total_tickets
    FROM public.suporte_solicitacoes;

    SELECT
        count(*) FILTER (WHERE status = 'failed'),
        count(*) FILTER (WHERE status = 'failed' AND created_at >= timezone('utc'::text, now()) - interval '24 hours')
    INTO v_failed_webhooks, v_failed_webhooks_24h
    FROM public.billing_webhook_logs;

    SELECT count(*) INTO v_total_employees FROM public.employees WHERE status IN ('active', 'vacation');
    SELECT count(*) INTO v_open_vacancies FROM public.vacancies WHERE status = 'open';

    RETURN jsonb_build_object(
        'total_users', v_total_users,
        'new_users_30d', v_new_users_30d,
        'total_companies', v_total_companies,
        'active_companies', v_active_companies,
        'active_subscriptions', v_active_subs,
        'trial_subscriptions', v_trial_subs,
        'canceled_subscriptions', v_canceled_subs,
        'mrr', v_mrr,
        'arr', ROUND(v_mrr * 12, 2),
        'open_tickets', v_open_tickets,
        'total_tickets', v_total_tickets,
        'failed_webhooks', v_failed_webhooks,
        'failed_webhooks_24h', v_failed_webhooks_24h,
        'total_employees', v_total_employees,
        'open_vacancies', v_open_vacancies
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_metrics() TO authenticated;

-- 5.2. Métricas de Banco de Dados e Storage Buckets
CREATE OR REPLACE FUNCTION public.admin_get_storage_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_db_size BIGINT := 0;
    v_db_quota BIGINT := 536870912; -- 512 MB padrão (ajustável conforme plano Supabase)
    v_storage_quota BIGINT := 1073741824; -- 1 GB padrão
    v_total_files BIGINT := 0;
    v_total_bytes BIGINT := 0;
    v_buckets JSONB := '[]'::jsonb;
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso negado: privilégio de superadministrador obrigatório.'
            USING ERRCODE = '42501';
    END IF;

    SELECT pg_database_size(current_database()) INTO v_db_size;

    SELECT
        COALESCE(SUM(agg.file_count), 0),
        COALESCE(SUM(agg.total_bytes), 0),
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'bucket_id', agg.bucket_id,
                    'is_public', agg.is_public,
                    'file_count', agg.file_count,
                    'total_bytes', agg.total_bytes,
                    'quota_bytes', 536870912
                )
                ORDER BY agg.total_bytes DESC, agg.bucket_id ASC
            ),
            '[]'::jsonb
        )
    INTO v_total_files, v_total_bytes, v_buckets
    FROM (
        SELECT
            b.id AS bucket_id,
            b.public AS is_public,
            COUNT(o.id)::BIGINT AS file_count,
            COALESCE(SUM(NULLIF(o.metadata->>'size', '')::BIGINT), 0)::BIGINT AS total_bytes
        FROM storage.buckets b
        LEFT JOIN storage.objects o ON o.bucket_id = b.id
        GROUP BY b.id, b.public
    ) agg;

    RETURN jsonb_build_object(
        'database_size_bytes', v_db_size,
        'database_quota_bytes', v_db_quota,
        'total_storage_bytes', v_total_bytes,
        'storage_quota_bytes', v_storage_quota,
        'total_files', v_total_files,
        'buckets', v_buckets
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_storage_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_storage_metrics() TO authenticated;

-- 5.3. Listagem Paginada de Tenants (Empresas Clientes + Assinatura + Uso)
CREATE OR REPLACE FUNCTION public.admin_list_tenants(
    p_search TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_tipo_perfil TEXT DEFAULT NULL,
    p_gateway TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 25,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
    v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
    v_status TEXT := NULLIF(trim(COALESCE(p_status, '')), '');
    v_perfil TEXT := NULLIF(trim(COALESCE(p_tipo_perfil, '')), '');
    v_gateway TEXT := NULLIF(trim(COALESCE(p_gateway, '')), '');
    v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);
    v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
    v_total BIGINT := 0;
    v_items JSONB := '[]'::jsonb;
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso negado: privilégio de superadministrador obrigatório.'
            USING ERRCODE = '42501';
    END IF;

    WITH tenant_base AS (
        SELECT
            c.id,
            c.name,
            c.cnpj,
            c.email,
            c.telefone,
            c.cidade,
            c.estado,
            COALESCE(c.porte, 'pequena') AS tipo_perfil,
            c.status AS company_status,
            c.responsavel_nome,
            c.created_at,
            COALESCE(ts.plan_tier, 'essencial') AS plan_tier,
            COALESCE(ts.status, CASE WHEN c.status = 'active' THEN 'active' WHEN c.status = 'pending_review' THEN 'pending' ELSE 'canceled' END) AS subscription_status,
            COALESCE(ts.monthly_value, 0) AS monthly_value,
            COALESCE(ts.gateway, 'manual') AS gateway,
            ts.external_customer_id,
            ts.external_subscription_id,
            ts.trial_ends_at,
            COALESCE(ts.storage_quota_mb, 1024) AS storage_quota_mb,
            COALESCE(ts.max_employees, 100) AS max_employees,
            ts.notes,
            (SELECT count(*) FROM public.employees e WHERE e.tenant_id = c.id) AS employees_count,
            (SELECT count(*) FROM public.vacancies v WHERE v.tenant_id = c.id AND v.status = 'open') AS open_vacancies_count,
            (SELECT count(*) FROM public.candidates cand WHERE cand.tenant_id = c.id) AS candidates_count,
            (SELECT count(*) FROM public.documents d WHERE d.tenant_id = c.id) AS documents_count,
            (SELECT count(*) FROM public.company_branches b WHERE b.company_id = c.id) AS branches_count,
            COALESCE((
                SELECT SUM(NULLIF(o.metadata->>'size', '')::BIGINT)
                FROM public.documents d
                JOIN storage.objects o ON o.name = d.storage_path
                WHERE d.tenant_id = c.id
            ), 0)::BIGINT AS storage_used_bytes
        FROM public.companies c
        LEFT JOIN public.tenant_subscriptions ts ON ts.company_id = c.id
    ),
    filtered AS (
        SELECT *
        FROM tenant_base tb
        WHERE (
            v_search IS NULL
            OR tb.name ILIKE '%' || v_search || '%'
            OR COALESCE(tb.cnpj, '') ILIKE '%' || v_search || '%'
            OR COALESCE(tb.email, '') ILIKE '%' || v_search || '%'
            OR COALESCE(tb.responsavel_nome, '') ILIKE '%' || v_search || '%'
        )
        AND (v_status IS NULL OR tb.subscription_status = v_status OR tb.company_status = v_status)
        AND (v_perfil IS NULL OR tb.tipo_perfil = v_perfil)
        AND (v_gateway IS NULL OR tb.gateway = v_gateway)
    )
    SELECT
        (SELECT count(*) FROM filtered),
        COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(paged) ORDER BY paged.created_at DESC)
                FROM (
                    SELECT * FROM filtered
                    ORDER BY created_at DESC
                    LIMIT v_limit OFFSET v_offset
                ) paged
            ),
            '[]'::jsonb
        )
    INTO v_total, v_items;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'limit', v_limit,
        'offset', v_offset
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_tenants(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_tenants(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- 5.4. Atualização de Plano/Assinatura/Trial de Tenant
CREATE OR REPLACE FUNCTION public.admin_update_tenant_subscription(
    p_company_id UUID,
    p_plan_tier TEXT,
    p_status TEXT,
    p_monthly_value NUMERIC DEFAULT 0,
    p_gateway TEXT DEFAULT 'manual',
    p_trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_external_customer_id TEXT DEFAULT NULL,
    p_external_subscription_id TEXT DEFAULT NULL,
    p_storage_quota_mb INTEGER DEFAULT 1024,
    p_max_employees INTEGER DEFAULT 100,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.tenant_subscriptions;
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso negado: privilégio de superadministrador obrigatório.'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.tenant_subscriptions (
        company_id, plan_tier, status, monthly_value, gateway,
        trial_ends_at, external_customer_id, external_subscription_id,
        storage_quota_mb, max_employees, notes
    ) VALUES (
        p_company_id, p_plan_tier, p_status, COALESCE(p_monthly_value, 0), COALESCE(p_gateway, 'manual'),
        p_trial_ends_at, NULLIF(trim(COALESCE(p_external_customer_id, '')), ''),
        NULLIF(trim(COALESCE(p_external_subscription_id, '')), ''),
        GREATEST(COALESCE(p_storage_quota_mb, 1024), 64),
        GREATEST(COALESCE(p_max_employees, 100), 1),
        NULLIF(trim(COALESCE(p_notes, '')), '')
    )
    ON CONFLICT (company_id) DO UPDATE SET
        plan_tier = EXCLUDED.plan_tier,
        status = EXCLUDED.status,
        monthly_value = EXCLUDED.monthly_value,
        gateway = EXCLUDED.gateway,
        trial_ends_at = EXCLUDED.trial_ends_at,
        external_customer_id = EXCLUDED.external_customer_id,
        external_subscription_id = EXCLUDED.external_subscription_id,
        storage_quota_mb = EXCLUDED.storage_quota_mb,
        max_employees = EXCLUDED.max_employees,
        notes = EXCLUDED.notes,
        updated_at = timezone('utc'::text, now())
    RETURNING * INTO v_row;

    RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_tenant_subscription(
    UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, INTEGER, INTEGER, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_tenant_subscription(
    UUID, TEXT, TEXT, NUMERIC, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, TEXT, INTEGER, INTEGER, TEXT
) TO authenticated;

-- 5.5. Listagem Administrativa de Tickets de Suporte (com dados do solicitante)
CREATE OR REPLACE FUNCTION public.admin_list_support_tickets(
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT := NULLIF(trim(COALESCE(p_status, '')), '');
    v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
    v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
    v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
    v_total BIGINT := 0;
    v_open_count BIGINT := 0;
    v_items JSONB := '[]'::jsonb;
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso negado: privilégio de superadministrador obrigatório.'
            USING ERRCODE = '42501';
    END IF;

    SELECT count(*) INTO v_open_count
    FROM public.suporte_solicitacoes
    WHERE status IN ('aberto', 'em_analise');

    WITH joined AS (
        SELECT
            s.id,
            s.user_id,
            COALESCE(up.full_name, 'Usuário CCBRH') AS user_name,
            COALESCE(up.email, au.email, 'sem-email') AS user_email,
            up.role_label AS user_role_label,
            s.tipo,
            s.titulo,
            s.descricao,
            s.status,
            s.resposta_equipe,
            s.plan_tier,
            s.contexto,
            s.created_at,
            s.updated_at
        FROM public.suporte_solicitacoes s
        LEFT JOIN public.user_profiles up ON up.id = s.user_id
        LEFT JOIN auth.users au ON au.id = s.user_id
    ),
    filtered AS (
        SELECT *
        FROM joined j
        WHERE (v_status IS NULL OR j.status = v_status)
          AND (
              v_search IS NULL
              OR j.titulo ILIKE '%' || v_search || '%'
              OR j.descricao ILIKE '%' || v_search || '%'
              OR j.user_name ILIKE '%' || v_search || '%'
              OR j.user_email ILIKE '%' || v_search || '%'
          )
    )
    SELECT
        (SELECT count(*) FROM filtered),
        COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(paged) ORDER BY paged.created_at DESC)
                FROM (
                    SELECT * FROM filtered
                    ORDER BY created_at DESC
                    LIMIT v_limit OFFSET v_offset
                ) paged
            ),
            '[]'::jsonb
        )
    INTO v_total, v_items;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'open_count', v_open_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_support_tickets(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_support_tickets(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- 5.6. Responder e Atualizar Ticket de Suporte
CREATE OR REPLACE FUNCTION public.admin_respond_support_ticket(
    p_ticket_id UUID,
    p_status TEXT,
    p_resposta_equipe TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated public.suporte_solicitacoes;
BEGIN
    IF NOT coalesce(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Acesso negado: privilégio de superadministrador obrigatório.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.suporte_solicitacoes
    SET status = p_status,
        resposta_equipe = NULLIF(trim(COALESCE(p_resposta_equipe, '')), ''),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_ticket_id
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação de suporte não encontrada.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN to_jsonb(v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_respond_support_ticket(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_respond_support_ticket(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- 6. BOOTSTRAP IDEMPOTENTE DO SUPERADMINISTRADOR PRINCIPAL CCBRH
-- ============================================================================
UPDATE public.user_profiles
SET is_superadmin = true
WHERE lower(email) = 'gestao@ccbrh.com.br'
  AND is_superadmin = false;

