-- ============================================================================
-- CCBRH SAAS — SUBMÓDULOS FÉRIAS & MEUS BENEFÍCIOS + INTEGRAÇÃO FOLHA CLT
-- Migration Idempotente (PostgreSQL / Supabase + RLS Fail-Closed)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper de timestamp (garantia idempotente caso executado isoladamente)
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
-- 1. TABELA DE CONTROLE DE FÉRIAS DO COLABORADOR (public.employee_vacations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_vacations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    acquisitive_period_label VARCHAR(30) NOT NULL,
    acquisitive_start DATE NOT NULL,
    acquisitive_end DATE NOT NULL,
    concessive_limit DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_taken INTEGER NOT NULL CHECK (days_taken BETWEEN 5 AND 30),
    sold_days INTEGER NOT NULL DEFAULT 0 CHECK (sold_days BETWEEN 0 AND 10),
    doubled_days INTEGER NOT NULL DEFAULT 0 CHECK (doubled_days BETWEEN 0 AND 30),
    fraction_number INTEGER NOT NULL DEFAULT 1 CHECK (fraction_number BETWEEN 1 AND 3),
    unjustified_absences INTEGER NOT NULL DEFAULT 0 CHECK (unjustified_absences >= 0),
    notice_date DATE,
    payment_due_date DATE,
    competence VARCHAR(7),
    payroll_entry_id UUID REFERENCES public.payroll_entries(id) ON DELETE SET NULL,
    advance_13th_requested BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(30) NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'approved', 'scheduled', 'in_progress', 'completed', 'canceled', 'rejected')),
    estimated_gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    estimated_third_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    estimated_abono_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    estimated_double_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_employee_vacations_tenant_emp_start
    ON public.employee_vacations (tenant_id, employee_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_employee_vacations_emp_status
    ON public.employee_vacations (employee_id, status);

CREATE INDEX IF NOT EXISTS idx_employee_vacations_payroll_entry
    ON public.employee_vacations (payroll_entry_id);

DROP TRIGGER IF EXISTS trg_employee_vacations_updated_at ON public.employee_vacations;
CREATE TRIGGER trg_employee_vacations_updated_at
    BEFORE UPDATE ON public.employee_vacations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.employee_vacations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_vacations FROM anon;
REVOKE ALL ON public.employee_vacations FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_vacations TO authenticated;

DROP POLICY IF EXISTS "employee_vacations_ccb_manage" ON public.employee_vacations;
CREATE POLICY "employee_vacations_ccb_manage" ON public.employee_vacations
    FOR ALL
    TO authenticated
    USING (public.is_ccb_staff() OR public.is_admin())
    WITH CHECK (public.is_ccb_staff() OR public.is_admin());

DROP POLICY IF EXISTS "employee_vacations_self_select" ON public.employee_vacations;
CREATE POLICY "employee_vacations_self_select" ON public.employee_vacations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.employees e
            WHERE e.id = employee_id
              AND e.tenant_id = tenant_id
              AND lower(e.email) = lower(COALESCE(auth.jwt()->>'email', ''))
        )
    );

DROP POLICY IF EXISTS "employee_vacations_self_request" ON public.employee_vacations;
CREATE POLICY "employee_vacations_self_request" ON public.employee_vacations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        status = 'requested'
        AND payroll_entry_id IS NULL
        AND approved_by IS NULL
        AND approved_at IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.employees e
            WHERE e.id = employee_id
              AND e.tenant_id = tenant_id
              AND lower(e.email) = lower(COALESCE(auth.jwt()->>'email', ''))
        )
    );

-- ============================================================================
-- 2. TABELA DE BENEFÍCIOS DO COLABORADOR (public.employee_benefits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    benefit_type VARCHAR(40) NOT NULL
        CHECK (benefit_type IN (
            'vale_transporte',
            'vale_refeicao',
            'vale_alimentacao',
            'plano_saude',
            'plano_odontologico',
            'auxilio_creche',
            'auxilio_home_office',
            'seguro_vida',
            'previdencia_privada',
            'vale_cultura',
            'auxilio_educacao',
            'outros'
        )),
    provider_name VARCHAR(150),
    plan_name VARCHAR(150),
    card_or_policy_number VARCHAR(100),
    monthly_employer_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monthly_employer_value >= 0),
    employee_discount_mode VARCHAR(20) NOT NULL DEFAULT 'fixed'
        CHECK (employee_discount_mode IN ('none', 'fixed', 'percent_salary', 'percent_benefit')),
    employee_discount_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (employee_discount_value >= 0),
    coparticipation_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (coparticipation_value >= 0),
    dependents_covered INTEGER NOT NULL DEFAULT 0 CHECK (dependents_covered >= 0),
    include_in_payroll BOOLEAN NOT NULL DEFAULT true,
    is_taxable BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'canceled')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_employee_benefits_tenant_emp_status
    ON public.employee_benefits (tenant_id, employee_id, status);

DROP TRIGGER IF EXISTS trg_employee_benefits_updated_at ON public.employee_benefits;
CREATE TRIGGER trg_employee_benefits_updated_at
    BEFORE UPDATE ON public.employee_benefits
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_benefits FROM anon;
REVOKE ALL ON public.employee_benefits FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_benefits TO authenticated;

DROP POLICY IF EXISTS "employee_benefits_ccb_manage" ON public.employee_benefits;
CREATE POLICY "employee_benefits_ccb_manage" ON public.employee_benefits
    FOR ALL
    TO authenticated
    USING (public.is_ccb_staff() OR public.is_admin())
    WITH CHECK (public.is_ccb_staff() OR public.is_admin());

DROP POLICY IF EXISTS "employee_benefits_self_select" ON public.employee_benefits;
CREATE POLICY "employee_benefits_self_select" ON public.employee_benefits
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.employees e
            WHERE e.id = employee_id
              AND e.tenant_id = tenant_id
              AND lower(e.email) = lower(COALESCE(auth.jwt()->>'email', ''))
        )
    );

-- ============================================================================
-- 3. EXTENSÃO RETROCOMPATÍVEL EM payroll_entries (Lei 7.418/1985 — Teto VT)
-- ============================================================================

ALTER TABLE public.payroll_entries
    ADD COLUMN IF NOT EXISTS vt_employer_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (vt_employer_value >= 0);
