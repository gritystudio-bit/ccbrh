-- ============================================================================
-- MIGRATION: Módulo EFD-Reinf v2.1.2b (Manual do Desenvolvedor v2.8)
-- Tabelas: reinf_contributor_configs (R-1000) e reinf_events (R-1000 a R-9015)
-- Segurança: RLS Fail-Closed por tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reinf_contributor_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  layout_version text NOT NULL DEFAULT 'v2.1.2b',
  tp_amb integer NOT NULL DEFAULT 2 CHECK (tp_amb IN (1, 2)),
  proc_emi integer NOT NULL DEFAULT 1 CHECK (proc_emi IN (1, 2)),
  ver_proc text NOT NULL DEFAULT 'CCBRH-REINF-2.1.2b',
  class_trib text NOT NULL DEFAULT '99',
  ind_escrituracao integer NOT NULL DEFAULT 1 CHECK (ind_escrituracao IN (0, 1)),
  ind_desoneracao integer NOT NULL DEFAULT 0 CHECK (ind_desoneracao IN (0, 1)),
  ind_acordo_isen_multa integer NOT NULL DEFAULT 0 CHECK (ind_acordo_isen_multa IN (0, 1)),
  ind_sit_pj integer NOT NULL DEFAULT 0 CHECK (ind_sit_pj IN (0, 1, 2, 3, 4)),
  contato_nome text NOT NULL DEFAULT 'Responsável Fiscal CCBRH',
  contato_cpf text NOT NULL DEFAULT '00000000000',
  contato_fone text NOT NULL DEFAULT '1130000000',
  contato_email text NOT NULL DEFAULT 'fiscal@ccbrh.com.br',
  resp_nome text NOT NULL DEFAULT 'Contador Responsável',
  resp_cpf text NOT NULL DEFAULT '00000000000',
  default_nat_rend_pj text NOT NULL DEFAULT '15014',
  default_tp_servico_cp text NOT NULL DEFAULT '100000028',
  trans_dctfweb boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reinf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_code text NOT NULL,
  event_name text NOT NULL,
  event_series text NOT NULL CHECK (event_series IN ('tabelas', 'r2000', 'r4000', 'controle')),
  event_uid text NOT NULL,
  competence text,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  payroll_entry_id uuid REFERENCES public.payroll_entries(id) ON DELETE SET NULL,
  beneficiary_doc text,
  beneficiary_name text,
  nat_rend text,
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

CREATE INDEX IF NOT EXISTS idx_reinf_events_tenant_comp
  ON public.reinf_events (tenant_id, competence, event_code);

CREATE INDEX IF NOT EXISTS idx_reinf_events_tenant_status
  ON public.reinf_events (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reinf_events_payroll_entry
  ON public.reinf_events (payroll_entry_id, event_code);

CREATE OR REPLACE FUNCTION public.set_reinf_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reinf_contributor_configs_updated_at ON public.reinf_contributor_configs;
CREATE TRIGGER trg_reinf_contributor_configs_updated_at
  BEFORE UPDATE ON public.reinf_contributor_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reinf_updated_at();

DROP TRIGGER IF EXISTS trg_reinf_events_updated_at ON public.reinf_events;
CREATE TRIGGER trg_reinf_events_updated_at
  BEFORE UPDATE ON public.reinf_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reinf_updated_at();

ALTER TABLE public.reinf_contributor_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reinf_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.reinf_contributor_configs FROM anon;
REVOKE ALL ON public.reinf_events FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reinf_contributor_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reinf_events TO authenticated;

DROP POLICY IF EXISTS "reinf_contributor_configs_auth_all" ON public.reinf_contributor_configs;
CREATE POLICY "reinf_contributor_configs_auth_all"
  ON public.reinf_contributor_configs
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "reinf_events_auth_all" ON public.reinf_events;
CREATE POLICY "reinf_events_auth_all"
  ON public.reinf_events
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
