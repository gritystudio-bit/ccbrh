import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import type {
  AdminTenantItem,
  AdminTheme,
  BillingGateway,
  SubscriptionPlanTier,
  SubscriptionStatus,
} from '../types';
import {
  CCBRH_PLAN_DEFINITIONS,
  fetchAdminTenants,
  updateAdminTenantSubscription,
} from '../services/adminService';
import { formatBRL, formatBytes } from '../routeUtils';

interface AdminTenantsTabProps {
  theme: AdminTheme;
}

const PAGE_SIZE = 15;

export const AdminTenantsTab: React.FC<AdminTenantsTabProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [items, setItems] = useState<AdminTenantItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [perfilFilter, setPerfilFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [page, setPage] = useState(0);

  const [editingTenant, setEditingTenant] = useState<AdminTenantItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formState, setFormState] = useState<{
    plan_tier: SubscriptionPlanTier;
    status: SubscriptionStatus;
    monthly_value: string;
    gateway: BillingGateway;
    trial_ends_at: string;
    external_customer_id: string;
    external_subscription_id: string;
    storage_quota_mb: string;
    max_employees: string;
    notes: string;
  }>({
    plan_tier: 'essencial',
    status: 'active',
    monthly_value: '0',
    gateway: 'manual',
    trial_ends_at: '',
    external_customer_id: '',
    external_subscription_id: '',
    storage_quota_mb: '1024',
    max_employees: '100',
    notes: '',
  });

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminTenants({
        search,
        status: statusFilter,
        tipoPerfil: perfilFilter,
        gateway: gatewayFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao listar tenants.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, perfilFilter, gatewayFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTenants();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadTenants]);

  const openManageModal = (tenant: AdminTenantItem) => {
    setEditingTenant(tenant);
    setFormState({
      plan_tier: tenant.plan_tier,
      status: tenant.subscription_status,
      monthly_value: String(tenant.monthly_value || 0),
      gateway: tenant.gateway,
      trial_ends_at: tenant.trial_ends_at ? tenant.trial_ends_at.slice(0, 10) : '',
      external_customer_id: tenant.external_customer_id || '',
      external_subscription_id: tenant.external_subscription_id || '',
      storage_quota_mb: String(tenant.storage_quota_mb || 1024),
      max_employees: String(tenant.max_employees || 100),
      notes: tenant.notes || '',
    });
  };

  const handlePlanChange = (nextPlan: SubscriptionPlanTier) => {
    const preset = CCBRH_PLAN_DEFINITIONS.find((p) => p.tier === nextPlan);
    setFormState((prev) => ({
      ...prev,
      plan_tier: nextPlan,
      monthly_value: preset && preset.monthlyPrice > 0 ? String(preset.monthlyPrice) : prev.monthly_value,
      storage_quota_mb: preset ? String(preset.storageQuotaMb) : prev.storage_quota_mb,
      max_employees: preset ? String(preset.maxEmployees) : prev.max_employees,
    }));
  };

  const extendTrialDays = (days: number) => {
    const base = formState.trial_ends_at ? new Date(`${formState.trial_ends_at}T12:00:00Z`) : new Date();
    base.setUTCDate(base.getUTCDate() + days);
    setFormState((prev) => ({
      ...prev,
      status: 'trial',
      trial_ends_at: base.toISOString().slice(0, 10),
    }));
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateAdminTenantSubscription({
        company_id: editingTenant.id,
        plan_tier: formState.plan_tier,
        status: formState.status,
        monthly_value: Number(formState.monthly_value) || 0,
        gateway: formState.gateway,
        trial_ends_at: formState.trial_ends_at ? `${formState.trial_ends_at}T23:59:59Z` : null,
        external_customer_id: formState.external_customer_id || null,
        external_subscription_id: formState.external_subscription_id || null,
        storage_quota_mb: Number(formState.storage_quota_mb) || 1024,
        max_employees: Number(formState.max_employees) || 100,
        notes: formState.notes || null,
      });
      setEditingTenant(null);
      setFeedback({ type: 'success', message: `Assinatura de ${editingTenant.name} atualizada.` });
      await loadTenants();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao salvar alterações do tenant.',
      });
    } finally {
      setSaving(false);
    }
  };

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
            Empresas Clientes & Assinaturas
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Tenants & Contas</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadTenants()}
          className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${cardClass}`}
        >
          <RefreshCw className={`w-4 h-4 text-[#f5a90e] ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar ({total})</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filtros */}
      <div className={`rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${cardClass}`}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Buscar empresa, CNPJ ou e-mail..."
            className={`w-full min-h-[44px] pl-9 pr-3 rounded-xl border text-xs focus:outline-none focus:border-[#082175] ${inputClass}`}
          />
        </div>

        <select
          aria-label="Filtrar por status"
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}
          className={`min-h-[44px] px-3 rounded-xl border text-xs focus:outline-none ${inputClass}`}
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="trial">Trial</option>
          <option value="pending">Pendente</option>
          <option value="past_due">Inadimplente</option>
          <option value="canceled">Cancelado</option>
        </select>

        <select
          aria-label="Filtrar por porte/perfil"
          value={perfilFilter}
          onChange={(e) => {
            setPage(0);
            setPerfilFilter(e.target.value);
          }}
          className={`min-h-[44px] px-3 rounded-xl border text-xs focus:outline-none ${inputClass}`}
        >
          <option value="">Todos os portes</option>
          <option value="micro">Microempresa</option>
          <option value="pequena">Pequena</option>
          <option value="media">Média</option>
          <option value="grande">Grande</option>
        </select>

        <select
          aria-label="Filtrar por gateway"
          value={gatewayFilter}
          onChange={(e) => {
            setPage(0);
            setGatewayFilter(e.target.value);
          }}
          className={`min-h-[44px] px-3 rounded-xl border text-xs focus:outline-none ${inputClass}`}
        >
          <option value="">Todos os gateways</option>
          <option value="manual">Manual / Fatura</option>
          <option value="stripe">Stripe</option>
          <option value="asaas">Asaas</option>
          <option value="mercadopago">Mercado Pago</option>
        </select>
      </div>

      {/* Lista / Tabela */}
      <div className={`rounded-xl border overflow-hidden shadow-xs ${cardClass}`}>
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#f5a90e]" />
            <span className={`text-xs ${mutedText}`}>Carregando empresas clientes...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-xs text-red-600">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-2 px-4">
            <Building2 className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold">Nenhum tenant encontrado</p>
            <p className={`text-xs ${mutedText}`}>Ajuste os filtros ou cadastre novas empresas no SaaS.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={isDark ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                  <th className="py-3 px-4 font-bold">Empresa / Tenant</th>
                  <th className="py-3 px-4 font-bold">Plano & Status</th>
                  <th className="py-3 px-4 font-bold">Gateway</th>
                  <th className="py-3 px-4 font-bold">Recursos</th>
                  <th className="py-3 px-4 font-bold">Storage</th>
                  <th className="py-3 px-4 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200'}>
                {items.map((tenant) => {
                  const quotaBytes = tenant.storage_quota_mb * 1024 * 1024;
                  const pct = Math.min(100, Math.round((tenant.storage_used_bytes / Math.max(quotaBytes, 1)) * 100));
                  return (
                    <tr key={tenant.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4">
                        <p className="font-bold">{tenant.name}</p>
                        <p className={`text-[11px] font-mono ${mutedText}`}>
                          {tenant.cnpj || 'Sem CNPJ'} · {tenant.tipo_perfil}
                        </p>
                        {tenant.email && <p className={`text-[11px] ${mutedText}`}>{tenant.email}</p>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold uppercase text-[11px]">{tenant.plan_tier}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#082175]/10 text-[#082175] dark:bg-[#f5a90e]/15 dark:text-[#f5a90e]">
                            {tenant.subscription_status}
                          </span>
                          <span className={`font-mono text-[11px] ${mutedText}`}>
                            {formatBRL(tenant.monthly_value)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold capitalize">{tenant.gateway}</p>
                        {tenant.external_subscription_id && (
                          <p className={`text-[10px] font-mono truncate max-w-[140px] ${mutedText}`}>
                            {tenant.external_subscription_id}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-mono">
                          {tenant.employees_count}/{tenant.max_employees} colab.
                        </p>
                        <p className={`text-[11px] ${mutedText}`}>
                          {tenant.open_vacancies_count} vagas · {tenant.documents_count} docs
                        </p>
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          <HardDrive className="w-3.5 h-3.5 text-[#9F8548]" />
                          <span>
                            {formatBytes(tenant.storage_used_bytes)} / {tenant.storage_quota_mb} MB
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-[#082175] dark:bg-[#f5a90e]"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openManageModal(tenant)}
                          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5 text-[#f5a90e]" />
                          <span>Gerenciar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {total > PAGE_SIZE && (
          <div className={`px-4 py-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={mutedText}>
              Página {page + 1} de {totalPages} ({total} empresas)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={`min-h-[44px] px-3 rounded-xl border inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 ${cardClass}`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`min-h-[44px] px-3 rounded-xl border inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 ${cardClass}`}
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Gestão do Tenant */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto ${cardClass}`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">{editingTenant.name}</h2>
                <p className={`text-xs font-mono ${mutedText}`}>{editingTenant.cnpj || editingTenant.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                aria-label="Fechar modal"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Plano</label>
                  <select
                    value={formState.plan_tier}
                    onChange={(e) => handlePlanChange(e.target.value as SubscriptionPlanTier)}
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  >
                    <option value="essencial">Essencial RH</option>
                    <option value="profissional">Profissional Multi-Filial</option>
                    <option value="enterprise">Enterprise Corporativo</option>
                    <option value="custom">Custom / Sob Medida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Status da Assinatura</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value as SubscriptionStatus }))}
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  >
                    <option value="active">Ativa</option>
                    <option value="trial">Em Trial</option>
                    <option value="pending">Pendente</option>
                    <option value="past_due">Inadimplente</option>
                    <option value="canceled">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.monthly_value}
                    onChange={(e) => setFormState((p) => ({ ...p, monthly_value: e.target.value }))}
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Gateway de Billing</label>
                  <select
                    value={formState.gateway}
                    onChange={(e) => setFormState((p) => ({ ...p, gateway: e.target.value as BillingGateway }))}
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  >
                    <option value="manual">Manual / Fatura</option>
                    <option value="stripe">Stripe</option>
                    <option value="asaas">Asaas</option>
                    <option value="mercadopago">Mercado Pago</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Quota Storage (MB)</label>
                  <input
                    type="number"
                    min="64"
                    value={formState.storage_quota_mb}
                    onChange={(e) => setFormState((p) => ({ ...p, storage_quota_mb: e.target.value }))}
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Limite Colaboradores</label>
                  <input
                    type="number"
                    min="1"
                    value={formState.max_employees}
                    onChange={(e) => setFormState((p) => ({ ...p, max_employees: e.target.value }))}
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  />
                </div>
              </div>

              {/* Extensão de Trial */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold">Fim do período Trial</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={formState.trial_ends_at}
                    onChange={(e) => setFormState((p) => ({ ...p, trial_ends_at: e.target.value }))}
                    className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                  />
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => extendTrialDays(d)}
                      className="min-h-[44px] inline-flex items-center gap-1 px-3 rounded-xl border border-[#f5a90e]/40 bg-[#f5a90e]/10 text-xs font-bold text-[#9F8548] dark:text-[#f5a90e] cursor-pointer"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>+{d}d</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* IDs Externos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">ID Externo do Cliente (Gateway)</label>
                  <input
                    type="text"
                    value={formState.external_customer_id}
                    onChange={(e) => setFormState((p) => ({ ...p, external_customer_id: e.target.value }))}
                    placeholder="cus_... / asaas_..."
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">ID Externo da Assinatura</label>
                  <input
                    type="text"
                    value={formState.external_subscription_id}
                    onChange={(e) => setFormState((p) => ({ ...p, external_subscription_id: e.target.value }))}
                    placeholder="sub_..."
                    className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono ${inputClass}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observações internas de billing</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
                  className={`w-full p-3 rounded-xl border text-xs ${inputClass}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className={`min-h-[44px] px-4 rounded-xl border text-xs font-semibold cursor-pointer ${cardClass}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar Assinatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
