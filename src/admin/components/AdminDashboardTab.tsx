import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CreditCard,
  Database,
  DollarSign,
  Flag,
  HardDrive,
  LifeBuoy,
  Loader2,
  Mail,
  RefreshCw,
  TrendingUp,
  Users,
  Webhook,
} from 'lucide-react';
import type {
  AdminDashboardMetrics,
  AdminStorageMetrics,
  AdminTabId,
  AdminTheme,
} from '../types';
import {
  fetchAdminDashboardMetrics,
  fetchAdminStorageMetrics,
} from '../services/adminService';
import { formatBRL, formatBytes } from '../routeUtils';

interface AdminDashboardTabProps {
  theme: AdminTheme;
  onNavigateTab: (tab: AdminTabId) => void;
  onOpenTicketsChange?: (count: number) => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  theme,
  onNavigateTab,
  onOpenTicketsChange,
}) => {
  const isDark = theme === 'dark';
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [storage, setStorage] = useState<AdminStorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s] = await Promise.all([
        fetchAdminDashboardMetrics(),
        fetchAdminStorageMetrics(),
      ]);
      setMetrics(m);
      setStorage(s);
      onOpenTicketsChange?.(m.open_tickets || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas administrativas.');
    } finally {
      setLoading(false);
    }
  }, [onOpenTicketsChange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  if (loading && !metrics) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#f5a90e]" />
        <p className={`text-sm font-medium ${mutedText}`}>Carregando indicadores globais...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/50 dark:border-red-900 p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-200">
              Não foi possível carregar o painel executivo
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Tentar novamente</span>
        </button>
      </div>
    );
  }

  const dbUsagePct = storage
    ? Math.min(100, Math.round((storage.database_size_bytes / Math.max(storage.database_quota_bytes, 1)) * 100))
    : 0;
  const storageUsagePct = storage
    ? Math.min(100, Math.round((storage.total_storage_bytes / Math.max(storage.storage_quota_bytes, 1)) * 100))
    : 0;

  const kpis = [
    {
      label: 'MRR (Receita Mensal)',
      value: formatBRL(metrics?.mrr || 0),
      sub: `${metrics?.active_subscriptions || 0} assinatura(s) ativa(s)`,
      icon: DollarSign,
      accent: 'text-emerald-600 bg-emerald-500/15',
    },
    {
      label: 'ARR (Receita Anual)',
      value: formatBRL(metrics?.arr || 0),
      sub: `${metrics?.trial_subscriptions || 0} em trial · ${metrics?.canceled_subscriptions || 0} cancelada(s)`,
      icon: TrendingUp,
      accent: 'text-sky-600 bg-sky-500/15',
    },
    {
      label: 'Usuários Cadastrados',
      value: String(metrics?.total_users || 0),
      sub: `+${metrics?.new_users_30d || 0} nos últimos 30 dias`,
      icon: Users,
      accent: 'text-indigo-600 bg-indigo-500/15',
    },
    {
      label: 'Tenants (Empresas)',
      value: String(metrics?.total_companies || 0),
      sub: `${metrics?.active_companies || 0} ativa(s) · ${metrics?.total_employees || 0} colab.`,
      icon: Building2,
      accent: 'text-[#082175] bg-[#082175]/10 dark:text-[#f5a90e] dark:bg-[#f5a90e]/15',
    },
    {
      label: 'Tickets Abertos',
      value: String(metrics?.open_tickets || 0),
      sub: `${metrics?.total_tickets || 0} solicitação(ões) no histórico`,
      icon: LifeBuoy,
      accent: 'text-amber-600 bg-amber-500/15',
    },
    {
      label: 'Webhooks com Falha',
      value: String(metrics?.failed_webhooks || 0),
      sub: `${metrics?.failed_webhooks_24h || 0} nas últimas 24h`,
      icon: Webhook,
      accent: 'text-red-600 bg-red-500/15',
    },
  ];

  const shortcuts: Array<{ tab: AdminTabId; title: string; desc: string; icon: React.FC<{ className?: string }> }> = [
    { tab: 'tenants', title: 'Gerenciar Tenants', desc: 'Alterar planos, trials e IDs externos', icon: Building2 },
    { tab: 'support', title: 'Atender Tickets', desc: 'Responder usuários e auditar webhooks', icon: LifeBuoy },
    { tab: 'emails', title: 'Disparar Campanha', desc: 'Editar templates HTML e segmentar público', icon: Mail },
    { tab: 'plans', title: 'Planos & Cupons', desc: 'Revisar quotas e criar descontos', icon: CreditCard },
    { tab: 'flags', title: 'Feature Flags', desc: 'Alternar recursos e modo de manutenção', icon: Flag },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
            Operações & Telemetria Global
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Visão Geral da Plataforma</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${cardClass}`}
        >
          <RefreshCw className={`w-4 h-4 text-[#f5a90e] ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar indicadores</span>
        </button>
      </div>

      {/* Grid KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`rounded-xl border p-5 shadow-xs ${cardClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-semibold ${mutedText}`}>{kpi.label}</p>
                  <p className="text-2xl font-extrabold mt-1.5 tracking-tight">{kpi.value}</p>
                  <p className={`text-[11px] mt-1 ${mutedText}`}>{kpi.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${kpi.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infraestrutura & Storage */}
      <section className={`rounded-xl border p-6 shadow-xs space-y-5 ${cardClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#f5a90e]" />
            <div>
              <h2 className="text-base font-bold">Storage & Infraestrutura Supabase</h2>
              <p className={`text-xs ${mutedText}`}>
                Consumo real de banco PostgreSQL e buckets de arquivos vs quotas configuradas
              </p>
            </div>
          </div>
          <span className={`text-xs font-mono ${mutedText}`}>
            {storage?.total_files || 0} arquivo(s) armazenado(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#082175] dark:text-[#f5a90e]" />
                Banco PostgreSQL
              </span>
              <span className="font-mono">
                {formatBytes(storage?.database_size_bytes || 0)} / {formatBytes(storage?.database_quota_bytes || 0)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#082175] dark:bg-[#f5a90e] transition-all"
                style={{ width: `${Math.max(dbUsagePct, 2)}%` }}
              />
            </div>
            <p className={`text-[11px] ${mutedText}`}>{dbUsagePct}% da quota de banco utilizada</p>
          </div>

          <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-[#082175] dark:text-[#f5a90e]" />
                Storage Total (Buckets)
              </span>
              <span className="font-mono">
                {formatBytes(storage?.total_storage_bytes || 0)} / {formatBytes(storage?.storage_quota_bytes || 0)}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${Math.max(storageUsagePct, 2)}%` }}
              />
            </div>
            <p className={`text-[11px] ${mutedText}`}>{storageUsagePct}% da quota de arquivos utilizada</p>
          </div>
        </div>

        {/* Detalhamento por bucket */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(storage?.buckets || []).map((bucket) => (
            <div
              key={bucket.bucket_id}
              className={`rounded-xl border p-3.5 text-xs space-y-1 ${
                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold truncate">{bucket.bucket_id}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    bucket.is_public
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {bucket.is_public ? 'Público' : 'Privado'}
                </span>
              </div>
              <p className={`text-[11px] font-mono ${mutedText}`}>
                {formatBytes(bucket.total_bytes)} · {bucket.file_count} arquivo(s)
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Atalhos rápidos */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#9F8548]">Atalhos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => onNavigateTab(item.tab)}
                className={`min-h-[44px] text-left rounded-xl border p-4 transition-all cursor-pointer group ${cardClass} hover:border-[#f5a90e]`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4 text-[#f5a90e]" />
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs font-bold mt-2.5">{item.title}</p>
                <p className={`text-[11px] mt-0.5 leading-snug ${mutedText}`}>{item.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
