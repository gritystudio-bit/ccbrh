-- ============================================================================
-- MIGRATION: Módulo eSocial v. S-1.3 (cons. até NT 07/2026 rev. 20/10/2026)
-- Tabelas: esocial_employer_configs (S-1000/S-1005/S-1020) e esocial_events
-- Segurança: RLS Fail-Closed por tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.esocial_employer_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  layout_version text NOT NULL DEFAULT 'S-1.3',
  tp_amb integer NOT NULL DEFAULT 2 CHECK (tp_amb IN (1, 2)),
  proc_emi integer NOT NULL DEFAULT 1,
  ver_proc text NOT NULL DEFAULT 'CCBRH-2026.3',
  class_trib text NOT NULL DEFAULT '99',
  ind_coop integer NOT NULL DEFAULT 0 CHECK (ind_coop IN (0, 1, 2, 3)),
  ind_constr integer NOT NULL DEFAULT 0 CHECK (ind_constr IN (0, 1)),
  ind_des_folha integer NOT NULL DEFAULT 0 CHECK (ind_des_folha IN (0, 1, 2)),
  ind_opt_reg_eletron integer NOT NULL DEFAULT 1 CHECK (ind_opt_reg_eletron IN (0, 1)),
  fpas text NOT NULL DEFAULT '515',
  cod_tercs text NOT NULL DEFAULT '0079',
  aliq_rat numeric(4,2) NOT NULL DEFAULT 2.00,
  fap numeric(5,4) NOT NULL DEFAULT 1.0000,
  cod_lotacao text NOT NULL DEFAULT 'LOT-001',
  tp_lotacao text NOT NULL DEFAULT '01',
  ide_tab_rubr text NOT NULL DEFAULT 'TABRUB01',
  cnae_prep text NOT NULL DEFAULT '6201501',
  cnpj_sind_default text NOT NULL DEFAULT '00000000000000',
  trans_dctfweb boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.esocial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_code text NOT NULL,
  event_name text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN ('tabelas', 'nao_periodicos', 'periodicos', 'controle')),
  event_uid text NOT NULL,
  competence text,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  payroll_entry_id uuid REFERENCES public.payroll_entries(id) ON DELETE SET NULL,
  vacation_id uuid REFERENCES public.employee_vacations(id) ON DELETE SET NULL,
  ind_retif integer NOT NULL DEFAULT 1 CHECK (ind_retif IN (1, 2)),
  tp_amb integer NOT NULL DEFAULT 2 CHECK (tp_amb IN (1, 2)),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'validated', 'transmitted', 'accepted', 'rejected', 'excluded')),
  receipt_number text,
  protocol_number text,
  orig_receipt_number text,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  xml_content text NOT NULL,
  return_totals jsonb,
  transmitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esocial_events_tenant_comp
  ON public.esocial_events (tenant_id, competence, event_code);

CREATE INDEX IF NOT EXISTS idx_esocial_events_tenant_status
  ON public.esocial_events (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_esocial_events_employee
  ON public.esocial_events (employee_id, event_code);

-- Triggers de updated_at
CREATE OR REPLACE FUNCTION public.set_esocial_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_esocial_employer_configs_updated_at ON public.esocial_employer_configs;
CREATE TRIGGER trg_esocial_employer_configs_updated_at
  BEFORE UPDATE ON public.esocial_employer_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_esocial_updated_at();

DROP TRIGGER IF EXISTS trg_esocial_events_updated_at ON public.esocial_events;
CREATE TRIGGER trg_esocial_events_updated_at
  BEFORE UPDATE ON public.esocial_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_esocial_updated_at();

-- RLS Estrito (Fail-Closed: anon sem acesso; authenticated autorizado)
ALTER TABLE public.esocial_employer_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.esocial_employer_configs FROM anon;
REVOKE ALL ON public.esocial_events FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.esocial_employer_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.esocial_events TO authenticated;

DROP POLICY IF EXISTS "esocial_employer_configs_auth_all" ON public.esocial_employer_configs;
CREATE POLICY "esocial_employer_configs_auth_all"
  ON public.esocial_employer_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "esocial_events_auth_all" ON public.esocial_events;
CREATE POLICY "esocial_events_auth_all"
  ON public.esocial_events
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
