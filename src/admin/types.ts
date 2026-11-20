export type AdminTabId =
  | 'dashboard'
  | 'tenants'
  | 'emails'
  | 'plans'
  | 'flags'
  | 'support';

export type AdminTheme = 'light' | 'dark';

export type AdminAuthState = 'loading' | 'unauthenticated' | 'forbidden' | 'authorized';

export interface AdminUserSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  isSuperadmin: boolean;
}

export type SupportTicketType = 'melhoria' | 'bug' | 'funcionalidade';

export type SupportTicketStatus =
  | 'aberto'
  | 'em_analise'
  | 'planejado'
  | 'resolvido'
  | 'descartado';

export interface SupportTechnicalContext {
  route: string;
  environment: string;
  activeTab?: string;
  companyName?: string | null;
  userAgent: string;
  viewport: string;
  language: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  tipo: SupportTicketType;
  titulo: string;
  descricao: string;
  status: SupportTicketStatus;
  resposta_equipe: string | null;
  plan_tier: string | null;
  contexto: SupportTechnicalContext | Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportTicket extends SupportTicket {
  user_name: string;
  user_email: string;
  user_role_label: string | null;
}

export interface AdminDashboardMetrics {
  total_users: number;
  new_users_30d: number;
  total_companies: number;
  active_companies: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  canceled_subscriptions: number;
  mrr: number;
  arr: number;
  open_tickets: number;
  total_tickets: number;
  failed_webhooks: number;
  failed_webhooks_24h: number;
  total_employees: number;
  open_vacancies: number;
}

export interface StorageBucketMetric {
  bucket_id: string;
  is_public: boolean;
  file_count: number;
  total_bytes: number;
  quota_bytes: number;
}

export interface AdminStorageMetrics {
  database_size_bytes: number;
  database_quota_bytes: number;
  total_storage_bytes: number;
  storage_quota_bytes: number;
  total_files: number;
  buckets: StorageBucketMetric[];
}

export type SubscriptionPlanTier = 'essencial' | 'profissional' | 'enterprise' | 'custom';
export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'pending';
export type BillingGateway = 'manual' | 'stripe' | 'asaas' | 'mercadopago';

export interface AdminTenantItem {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  tipo_perfil: 'micro' | 'pequena' | 'media' | 'grande';
  company_status: 'pending_review' | 'active' | 'inactive';
  responsavel_nome: string | null;
  created_at: string;
  plan_tier: SubscriptionPlanTier;
  subscription_status: SubscriptionStatus;
  monthly_value: number;
  gateway: BillingGateway;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  trial_ends_at: string | null;
  storage_quota_mb: number;
  max_employees: number;
  notes: string | null;
  employees_count: number;
  open_vacancies_count: number;
  candidates_count: number;
  documents_count: number;
  branches_count: number;
  storage_used_bytes: number;
}

export interface AdminTenantListResponse {
  items: AdminTenantItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminTenantFilter {
  search: string;
  status: string;
  tipoPerfil: string;
  gateway: string;
  limit: number;
  offset: number;
}

export interface TenantSubscriptionUpdateInput {
  company_id: string;
  plan_tier: SubscriptionPlanTier;
  status: SubscriptionStatus;
  monthly_value: number;
  gateway: BillingGateway;
  trial_ends_at: string | null;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  storage_quota_mb: number;
  max_employees: number;
  notes: string | null;
}

export interface FeatureFlagRecord {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  regras: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export type EmailTemplateCategory = 'onboarding' | 'comunicado' | 'novidades' | 'billing' | 'suporte';

export interface EmailTemplateRecord {
  id: string;
  slug: string;
  nome: string;
  assunto: string;
  corpo_html: string;
  variaveis: string[];
  categoria: EmailTemplateCategory;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type EmailCampaignSegment =
  | 'todos_usuarios'
  | 'equipe_ccb'
  | 'empresas_ativas'
  | 'empresas_pendentes'
  | 'leads_comerciais';

export type EmailCampaignStatus = 'rascunho' | 'enviando' | 'enviada' | 'falha' | 'simulada';

export interface EmailCampaignRecord {
  id: string;
  template_id: string | null;
  nome: string;
  assunto: string;
  corpo_html: string;
  segmento: EmailCampaignSegment;
  status: EmailCampaignStatus;
  total_destinatarios: number;
  enviados: number;
  falhas: number;
  erro_detalhe: string | null;
  enviado_em: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BillingCouponRecord {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_redemptions: number | null;
  redemptions_count: number;
  valid_until: string | null;
  active: boolean;
  gateway: BillingGateway;
  created_at: string;
  updated_at: string;
}

export type WebhookProvider = 'stripe' | 'asaas' | 'mercadopago' | 'resend' | 'manual';
export type WebhookStatus = 'received' | 'processed' | 'failed' | 'ignored';

export interface BillingWebhookLogRecord {
  id: string;
  provider: WebhookProvider;
  event_type: string;
  external_event_id: string | null;
  status: WebhookStatus;
  http_status: number | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

export interface PlanDefinition {
  tier: SubscriptionPlanTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  storageQuotaMb: number;
  maxEmployees: number;
  highlights: string[];
}

export interface MaintenanceStatus {
  enabled: boolean;
  message: string | null;
  updated_at: string | null;
}
