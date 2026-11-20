import { describe, expect, it } from 'vitest';
import {
  ADMIN_BASE_PATH,
  VALID_ADMIN_TABS,
  buildAdminTabPath,
  formatBRL,
  formatBytes,
  isAdminPathname,
  normalizePathname,
  resolveAdminTabFromPath,
} from '../routeUtils';
import type {
  AdminDashboardMetrics,
  AdminStorageMetrics,
  AdminTabId,
  AdminTenantItem,
  FeatureFlagRecord,
  SupportTicket,
} from '../types';
import {
  SUPPORT_DESC_MAX,
  SUPPORT_DESC_MIN,
  SUPPORT_TITLE_MAX,
  SUPPORT_TITLE_MIN,
  buildSupportTechnicalContext,
  isMissingSupportTableError,
  validateSupportTicketInput,
} from '../../services/supportService';

describe('Normalização e isolamento da rota /admin', () => {
  it('normaliza barras duplicadas, query strings, hashes e barra final', () => {
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('/admin/')).toBe('/admin');
    expect(normalizePathname('//admin///tenants/?page=2#top')).toBe('/admin/tenants');
    expect(normalizePathname('admin/support/')).toBe('/admin/support');
  });

  it('isola estritamente /admin e /admin/* sem falsos positivos', () => {
    expect(isAdminPathname('/admin')).toBe(true);
    expect(isAdminPathname('/admin/')).toBe(true);
    expect(isAdminPathname('/ADMIN/Tenants')).toBe(true);
    expect(isAdminPathname('/admin/support?status=aberto')).toBe(true);

    expect(isAdminPathname('/')).toBe(false);
    expect(isAdminPathname('/vagas')).toBe(false);
    expect(isAdminPathname('/administracao')).toBe(false);
    expect(isAdminPathname('/admin-panel')).toBe(false);
    expect(isAdminPathname('/portal/admin')).toBe(false);
  });

  it('resolve corretamente as 6 abas administrativas e aplica fallback seguro para dashboard', () => {
    expect(VALID_ADMIN_TABS).toEqual([
      'dashboard',
      'tenants',
      'emails',
      'plans',
      'flags',
      'support',
    ]);

    expect(resolveAdminTabFromPath('/admin')).toBe('dashboard');
    expect(resolveAdminTabFromPath('/admin/dashboard')).toBe('dashboard');
    expect(resolveAdminTabFromPath('/admin/tenants')).toBe('tenants');
    expect(resolveAdminTabFromPath('/admin/emails')).toBe('emails');
    expect(resolveAdminTabFromPath('/admin/plans')).toBe('plans');
    expect(resolveAdminTabFromPath('/admin/flags')).toBe('flags');
    expect(resolveAdminTabFromPath('/admin/support')).toBe('support');
    expect(resolveAdminTabFromPath('/admin/desconhecida')).toBe('dashboard');
    expect(resolveAdminTabFromPath('/outra-rota')).toBe('dashboard');
  });

  it('constrói paths canônicos para cada aba administrativa', () => {
    expect(buildAdminTabPath('dashboard')).toBe(ADMIN_BASE_PATH);
    expect(buildAdminTabPath('tenants')).toBe('/admin/tenants');
    expect(buildAdminTabPath('emails')).toBe('/admin/emails');
    expect(buildAdminTabPath('plans')).toBe('/admin/plans');
    expect(buildAdminTabPath('flags')).toBe('/admin/flags');
    expect(buildAdminTabPath('support')).toBe('/admin/support');
  });
});

describe('Contratos e validações do Módulo de Suporte', () => {
  it('valida limites mínimos e máximos de título e descrição', () => {
    expect(validateSupportTicketInput('ab', 'descrição válida com mais de dez caracteres').valid).toBe(false);
    expect(
      validateSupportTicketInput('a'.repeat(SUPPORT_TITLE_MAX + 1), 'descrição válida longa').valid
    ).toBe(false);
    expect(validateSupportTicketInput('Título válido', 'curta').valid).toBe(false);
    expect(
      validateSupportTicketInput('Título válido', 'x'.repeat(SUPPORT_DESC_MAX + 1)).valid
    ).toBe(false);

    expect(
      validateSupportTicketInput(
        'a'.repeat(SUPPORT_TITLE_MIN),
        'b'.repeat(SUPPORT_DESC_MIN)
      ).valid
    ).toBe(true);
  });

  it('gera contexto técnico não sensível com campos esperados', () => {
    const ctx = buildSupportTechnicalContext({ activeTab: 'support', companyName: 'Empresa Teste' });
    expect(ctx.activeTab).toBe('support');
    expect(ctx.companyName).toBe('Empresa Teste');
    expect(typeof ctx.route).toBe('string');
    expect(typeof ctx.userAgent).toBe('string');
    expect(typeof ctx.viewport).toBe('string');
    expect(typeof ctx.language).toBe('string');
    expect(Number.isNaN(Date.parse(ctx.timestamp))).toBe(false);
  });

  it('detecta erro de tabela suporte_solicitacoes ausente para fallback gracioso', () => {
    expect(isMissingSupportTableError({ code: '42P01', message: 'relation does not exist' })).toBe(true);
    expect(isMissingSupportTableError({ code: 'PGRST205', message: 'Could not find table' })).toBe(true);
    expect(isMissingSupportTableError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingSupportTableError(null)).toBe(false);
  });
});

describe('Contratos de tipos e utilitários do Portal Admin', () => {
  it('formata bytes e valores monetários corretamente', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBRL(1290)).toContain('1.290,00');
  });

  it('satisfaz estritamente os contratos de tipos do módulo admin', () => {
    const tab: AdminTabId = 'support';
    const metrics: AdminDashboardMetrics = {
      total_users: 10,
      new_users_30d: 3,
      total_companies: 4,
      active_companies: 4,
      active_subscriptions: 3,
      trial_subscriptions: 1,
      canceled_subscriptions: 0,
      mrr: 4500,
      arr: 54000,
      open_tickets: 2,
      total_tickets: 8,
      failed_webhooks: 0,
      failed_webhooks_24h: 0,
      total_employees: 120,
      open_vacancies: 6,
    };

    const storage: AdminStorageMetrics = {
      database_size_bytes: 12_000_000,
      database_quota_bytes: 536_870_912,
      total_storage_bytes: 4_000_000,
      storage_quota_bytes: 1_073_741_824,
      total_files: 18,
      buckets: [
        {
          bucket_id: 'ccbrh-docs',
          is_public: false,
          file_count: 10,
          total_bytes: 2_500_000,
          quota_bytes: 536_870_912,
        },
      ],
    };

    const tenant: AdminTenantItem = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Empresa Modelo Ltda',
      cnpj: '12345678000199',
      email: 'rh@modelo.com.br',
      telefone: '11999999999',
      cidade: 'São Paulo',
      estado: 'SP',
      tipo_perfil: 'media',
      company_status: 'active',
      responsavel_nome: 'João Gestor',
      created_at: new Date().toISOString(),
      plan_tier: 'profissional',
      subscription_status: 'active',
      monthly_value: 1290,
      gateway: 'asaas',
      external_customer_id: 'cus_123',
      external_subscription_id: 'sub_456',
      trial_ends_at: null,
      storage_quota_mb: 5120,
      max_employees: 250,
      notes: null,
      employees_count: 42,
      open_vacancies_count: 3,
      candidates_count: 15,
      documents_count: 88,
      branches_count: 2,
      storage_used_bytes: 1_048_576,
    };

    const ticket: SupportTicket = {
      id: '00000000-0000-0000-0000-000000000002',
      user_id: '00000000-0000-0000-0000-000000000003',
      tipo: 'bug',
      titulo: 'Erro de layout no mobile',
      descricao: 'Ao abrir a folha no celular o botão fica cortado.',
      status: 'aberto',
      resposta_equipe: null,
      plan_tier: 'profissional',
      contexto: { route: '/', environment: 'production' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const flag: FeatureFlagRecord = {
      id: 'maintenance_mode',
      nome: 'Modo de Manutenção',
      descricao: 'Ativa tela de manutenção',
      ativo: false,
      regras: { message: 'Em manutenção' },
      updated_at: new Date().toISOString(),
      updated_by: null,
    };

    expect(tab).toBe('support');
    expect(metrics.arr).toBe(metrics.mrr * 12);
    expect(storage.buckets).toHaveLength(1);
    expect(tenant.plan_tier).toBe('profissional');
    expect(ticket.status).toBe('aberto');
    expect(flag.id).toBe('maintenance_mode');
  });
});
