import { supabase } from '../../lib/supabase';
import type {
  AdminDashboardMetrics,
  AdminStorageMetrics,
  AdminSupportTicket,
  AdminTenantFilter,
  AdminTenantListResponse,
  AdminUserSession,
  BillingCouponRecord,
  BillingGateway,
  BillingWebhookLogRecord,
  EmailCampaignRecord,
  EmailCampaignSegment,
  EmailTemplateCategory,
  EmailTemplateRecord,
  FeatureFlagRecord,
  MaintenanceStatus,
  PlanDefinition,
  SupportTicketStatus,
  TenantSubscriptionUpdateInput,
} from '../types';

export const CCBRH_PLAN_DEFINITIONS: readonly PlanDefinition[] = [
  {
    tier: 'essencial',
    name: 'Essencial RH',
    tagline: 'Empresas de pequeno porte em estruturação de RH e DP',
    monthlyPrice: 490,
    storageQuotaMb: 1024,
    maxEmployees: 50,
    highlights: [
      'Até 50 colaboradores ativos',
      '1 GB de armazenamento documental',
      'Folha CLT/PJ e Portal do Candidato',
    ],
  },
  {
    tier: 'profissional',
    name: 'Profissional Multi-Filial',
    tagline: 'Operações em crescimento com filiais e recrutamento contínuo',
    monthlyPrice: 1290,
    storageQuotaMb: 5120,
    maxEmployees: 250,
    highlights: [
      'Até 250 colaboradores e múltiplas filiais',
      '5 GB de armazenamento documental',
      'Disparo de holerites por e-mail + People Analytics',
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise Corporativo',
    tagline: 'Grupos empresariais com alta volumetria e consultoria dedicada',
    monthlyPrice: 2890,
    storageQuotaMb: 20480,
    maxEmployees: 1500,
    highlights: [
      'Até 1.500 colaboradores com SLA prioritário',
      '20 GB de armazenamento com auditoria LGPD',
      'Motor de IA analítico + Consultoria Jurídica Trabalhista',
    ],
  },
  {
    tier: 'custom',
    name: 'Custom / Sob Medida',
    tagline: 'Contratos especiais de consultoria dedicada CCB Soluções em RH',
    monthlyPrice: 0,
    storageQuotaMb: 51200,
    maxEmployees: 5000,
    highlights: [
      'Limites e quotas personalizados por contrato',
      'Faturamento sob medida via gateway ou boleto corporativo',
      'Acompanhamento executivo exclusivo',
    ],
  },
] as const;

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    const { data, error } = await supabase.rpc('get_maintenance_status');
    if (error || !data || typeof data !== 'object') {
      return { enabled: false, message: null, updated_at: null };
    }
    const payload = data as Partial<MaintenanceStatus>;
    return {
      enabled: Boolean(payload.enabled),
      message: typeof payload.message === 'string' ? payload.message : null,
      updated_at: typeof payload.updated_at === 'string' ? payload.updated_at : null,
    };
  } catch {
    return { enabled: false, message: null, updated_at: null };
  }
}

export async function resolveAdminSession(): Promise<{
  authenticated: boolean;
  user: AdminUserSession | null;
  error?: string;
}> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    return { authenticated: false, user: null, error: sessionErr.message };
  }

  const sessionUser = sessionData.session?.user;
  if (!sessionUser) {
    return { authenticated: false, user: null };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, role_label, is_active, is_superadmin')
    .eq('id', sessionUser.id)
    .maybeSingle();

  if (profileErr) {
    // Fail-closed se a coluna is_superadmin ainda não existir ou ocorrer erro de permissão
    return {
      authenticated: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email || '',
        fullName: sessionUser.email || 'Usuário autenticado',
        role: 'unknown',
        roleLabel: 'Sem permissão administrativa',
        isSuperadmin: false,
      },
      error: profileErr.message,
    };
  }

  if (!profile || !profile.is_active) {
    return {
      authenticated: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email || '',
        fullName: profile?.full_name || sessionUser.email || 'Usuário',
        role: profile?.role || 'inactive',
        roleLabel: profile?.role_label || 'Perfil inativo',
        isSuperadmin: false,
      },
    };
  }

  return {
    authenticated: true,
    user: {
      id: profile.id,
      email: profile.email || sessionUser.email || '',
      fullName: profile.full_name || sessionUser.email || 'Superadmin',
      role: profile.role,
      roleLabel: profile.role_label || 'Superadministrador',
      isSuperadmin: Boolean(profile.is_superadmin),
    },
  };
}

export async function signInAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return {
      success: false,
      error:
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha inválidos. Verifique suas credenciais.'
          : error.message,
    };
  }

  return { success: true };
}

export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  const { data, error } = await supabase.rpc('admin_get_dashboard_metrics');
  if (error) throw new Error(error.message);
  return data as AdminDashboardMetrics;
}

export async function fetchAdminStorageMetrics(): Promise<AdminStorageMetrics> {
  const { data, error } = await supabase.rpc('admin_get_storage_metrics');
  if (error) throw new Error(error.message);
  return data as AdminStorageMetrics;
}

export async function fetchAdminTenants(
  filter: AdminTenantFilter
): Promise<AdminTenantListResponse> {
  const { data, error } = await supabase.rpc('admin_list_tenants', {
    p_search: filter.search || null,
    p_status: filter.status || null,
    p_tipo_perfil: filter.tipoPerfil || null,
    p_gateway: filter.gateway || null,
    p_limit: filter.limit,
    p_offset: filter.offset,
  });
  if (error) throw new Error(error.message);
  return data as AdminTenantListResponse;
}

export async function updateAdminTenantSubscription(
  input: TenantSubscriptionUpdateInput
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_tenant_subscription', {
    p_company_id: input.company_id,
    p_plan_tier: input.plan_tier,
    p_status: input.status,
    p_monthly_value: input.monthly_value,
    p_gateway: input.gateway,
    p_trial_ends_at: input.trial_ends_at,
    p_external_customer_id: input.external_customer_id,
    p_external_subscription_id: input.external_subscription_id,
    p_storage_quota_mb: input.storage_quota_mb,
    p_max_employees: input.max_employees,
    p_notes: input.notes,
  });
  if (error) throw new Error(error.message);
}

export async function fetchFeatureFlags(): Promise<FeatureFlagRecord[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('id, nome, descricao, ativo, regras, updated_at, updated_by')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as FeatureFlagRecord[];
}

export async function toggleFeatureFlag(
  id: string,
  ativo: boolean,
  updatedBy: string
): Promise<FeatureFlagRecord> {
  const { data, error } = await supabase
    .from('feature_flags')
    .update({ ativo, updated_by: updatedBy })
    .eq('id', id)
    .select('id, nome, descricao, ativo, regras, updated_at, updated_by')
    .single();
  if (error) throw new Error(error.message);
  return data as FeatureFlagRecord;
}

export async function updateFeatureFlagRules(
  id: string,
  regras: Record<string, unknown>,
  updatedBy: string
): Promise<FeatureFlagRecord> {
  const { data, error } = await supabase
    .from('feature_flags')
    .update({ regras, updated_by: updatedBy })
    .eq('id', id)
    .select('id, nome, descricao, ativo, regras, updated_at, updated_by')
    .single();
  if (error) throw new Error(error.message);
  return data as FeatureFlagRecord;
}

export async function createFeatureFlag(input: {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  regras: Record<string, unknown>;
  updatedBy: string;
}): Promise<FeatureFlagRecord> {
  const { data, error } = await supabase
    .from('feature_flags')
    .insert({
      id: input.id.trim().toLowerCase(),
      nome: input.nome.trim(),
      descricao: input.descricao.trim() || null,
      ativo: input.ativo,
      regras: input.regras,
      updated_by: input.updatedBy,
    })
    .select('id, nome, descricao, ativo, regras, updated_at, updated_by')
    .single();
  if (error) throw new Error(error.message);
  return data as FeatureFlagRecord;
}

export async function fetchEmailTemplates(): Promise<EmailTemplateRecord[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('id, slug, nome, assunto, corpo_html, variaveis, categoria, created_at, updated_at, updated_by')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as EmailTemplateRecord[];
}

export async function upsertEmailTemplate(input: {
  id?: string;
  slug: string;
  nome: string;
  assunto: string;
  corpo_html: string;
  variaveis: string[];
  categoria: EmailTemplateCategory;
  updatedBy: string;
}): Promise<EmailTemplateRecord> {
  const payload = {
    slug: input.slug.trim().toLowerCase(),
    nome: input.nome.trim(),
    assunto: input.assunto.trim(),
    corpo_html: input.corpo_html,
    variaveis: input.variaveis,
    categoria: input.categoria,
    updated_by: input.updatedBy,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('email_templates')
      .update(payload)
      .eq('id', input.id)
      .select('id, slug, nome, assunto, corpo_html, variaveis, categoria, created_at, updated_at, updated_by')
      .single();
    if (error) throw new Error(error.message);
    return data as EmailTemplateRecord;
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert(payload)
    .select('id, slug, nome, assunto, corpo_html, variaveis, categoria, created_at, updated_at, updated_by')
    .single();
  if (error) throw new Error(error.message);
  return data as EmailTemplateRecord;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchEmailCampaigns(): Promise<EmailCampaignRecord[]> {
  const { data, error } = await supabase
    .from('email_campaigns')
    .select(
      'id, template_id, nome, assunto, corpo_html, segmento, status, total_destinatarios, enviados, falhas, erro_detalhe, enviado_em, created_by, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []) as EmailCampaignRecord[];
}

export async function dispatchEmailCampaign(input: {
  nome: string;
  assunto: string;
  corpoHtml: string;
  segmento: EmailCampaignSegment;
  templateId?: string | null;
  createdBy: string;
}): Promise<{
  providerConfigured: boolean;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  message?: string;
}> {
  const { data, error } = await supabase.functions.invoke('admin-send-campaign', {
    body: {
      nome: input.nome,
      assunto: input.assunto,
      corpoHtml: input.corpoHtml,
      segmento: input.segmento,
      templateId: input.templateId ?? null,
    },
  });

  if (!error && data && typeof data === 'object') {
    const res = data as {
      providerConfigured?: boolean;
      totalRecipients?: number;
      sentCount?: number;
      failedCount?: number;
      message?: string;
    };
    return {
      providerConfigured: Boolean(res.providerConfigured),
      totalRecipients: Number(res.totalRecipients || 0),
      sentCount: Number(res.sentCount || 0),
      failedCount: Number(res.failedCount || 0),
      message: res.message,
    };
  }

  // Fallback seguro: salva a campanha como rascunho/simulada caso a Edge Function ainda não esteja publicada
  const { error: insertErr } = await supabase.from('email_campaigns').insert({
    template_id: input.templateId ?? null,
    nome: input.nome.trim(),
    assunto: input.assunto.trim(),
    corpo_html: input.corpoHtml,
    segmento: input.segmento,
    status: 'rascunho',
    erro_detalhe:
      error?.message || 'Edge Function admin-send-campaign ainda não implantada no ambiente remoto.',
    created_by: input.createdBy,
  });

  if (insertErr) throw new Error(insertErr.message);

  return {
    providerConfigured: false,
    totalRecipients: 0,
    sentCount: 0,
    failedCount: 0,
    message:
      'Campanha salva como rascunho. Implante a Edge Function "admin-send-campaign" com RESEND_API_KEY para disparos reais.',
  };
}

export async function fetchBillingCoupons(): Promise<BillingCouponRecord[]> {
  const { data, error } = await supabase
    .from('billing_coupons')
    .select(
      'id, code, description, discount_type, discount_value, max_redemptions, redemptions_count, valid_until, active, gateway, created_at, updated_at'
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as BillingCouponRecord[];
}

export async function createBillingCoupon(input: {
  code: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  valid_until: string | null;
  gateway: BillingGateway;
}): Promise<BillingCouponRecord> {
  const { data, error } = await supabase
    .from('billing_coupons')
    .insert({
      code: input.code.trim().toUpperCase(),
      description: input.description.trim() || null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      max_redemptions: input.max_redemptions,
      valid_until: input.valid_until,
      gateway: input.gateway,
      active: true,
    })
    .select(
      'id, code, description, discount_type, discount_value, max_redemptions, redemptions_count, valid_until, active, gateway, created_at, updated_at'
    )
    .single();
  if (error) throw new Error(error.message);
  return data as BillingCouponRecord;
}

export async function toggleBillingCoupon(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('billing_coupons').update({ active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBillingCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('billing_coupons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchAdminSupportTickets(params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AdminSupportTicket[]; total: number; open_count: number }> {
  const { data, error } = await supabase.rpc('admin_list_support_tickets', {
    p_status: params.status || null,
    p_search: params.search || null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return data as { items: AdminSupportTicket[]; total: number; open_count: number };
}

export async function respondAdminSupportTicket(
  ticketId: string,
  status: SupportTicketStatus,
  respostaEquipe: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_respond_support_ticket', {
    p_ticket_id: ticketId,
    p_status: status,
    p_resposta_equipe: respostaEquipe,
  });
  if (error) throw new Error(error.message);
}

export async function fetchWebhookLogs(params: {
  provider?: string;
  status?: string;
  search?: string;
}): Promise<BillingWebhookLogRecord[]> {
  let query = supabase
    .from('billing_webhook_logs')
    .select(
      'id, provider, event_type, external_event_id, status, http_status, error_message, payload, processed_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (params.provider) {
    query = query.eq('provider', params.provider);
  }
  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data || []) as BillingWebhookLogRecord[];
  const cleanSearch = (params.search || '').trim().toLowerCase();
  if (!cleanSearch) return rows;

  return rows.filter(
    (row) =>
      row.event_type.toLowerCase().includes(cleanSearch) ||
      (row.external_event_id || '').toLowerCase().includes(cleanSearch) ||
      (row.error_message || '').toLowerCase().includes(cleanSearch)
  );
}
