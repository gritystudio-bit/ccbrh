import React, { useState } from 'react';
import {
  Building2,
  CreditCard,
  ExternalLink,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import type { AdminTabId, AdminTheme, AdminUserSession } from '../types';

interface AdminLayoutProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  user: AdminUserSession;
  theme: AdminTheme;
  onToggleTheme: () => void;
  onLogout: () => Promise<void>;
  openTicketsCount?: number;
  maintenanceActive?: boolean;
  children: React.ReactNode;
}

const ADMIN_NAV_ITEMS: Array<{
  id: AdminTabId;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Visão Geral', description: 'KPIs e Infraestrutura', icon: LayoutDashboard },
  { id: 'tenants', label: 'Tenants & Contas', description: 'Empresas e Assinaturas', icon: Building2 },
  { id: 'emails', label: 'E-mail Marketing', description: 'Templates e Campanhas', icon: Mail },
  { id: 'plans', label: 'Planos & Billing', description: 'Quotas e Cupons', icon: CreditCard },
  { id: 'flags', label: 'Feature Flags', description: 'Toggles e Manutenção', icon: Flag },
  { id: 'support', label: 'Suporte & Logs', description: 'Tickets e Webhooks', icon: LifeBuoy },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onSelectTab,
  user,
  theme,
  onToggleTheme,
  onLogout,
  openTicketsCount = 0,
  maintenanceActive = false,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDark = theme === 'dark';
  const envLabel = import.meta.env.PROD ? 'PRODUÇÃO' : 'DESENVOLVIMENTO';

  const handleNavClick = (tab: AdminTabId) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Topbar fixa */}
      <header
        className={`fixed top-0 inset-x-0 z-40 h-16 border-b flex items-center justify-between px-4 sm:px-6 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-[#082175] border-[#03416A] text-white'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu administrativo"
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#f5a90e] text-[#082175] flex items-center justify-center shrink-0 font-extrabold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  ccbrh · Admin
                </span>
                <span
                  className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    import.meta.env.PROD
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {envLabel}
                </span>
                {maintenanceActive && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-200 border border-red-400/30">
                    MANUTENÇÃO ATIVA
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate hidden sm:block">
                Portal Administrativo Isolado
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col text-right mr-1">
            <span className="text-xs font-bold leading-tight">{user.fullName}</span>
            <span className="text-[11px] text-[#f5a90e] font-mono leading-tight">{user.email}</span>
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#f5a90e]" /> : <Moon className="w-4 h-4 text-[#f5a90e]" />}
          </button>

          <a
            href="/"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#f5a90e]" />
            <span className="hidden sm:inline">Acessar SaaS</span>
          </a>

          <button
            type="button"
            onClick={() => void onLogout()}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 hover:bg-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#f5a90e]" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar Desktop */}
        <aside
          className={`hidden lg:flex flex-col fixed top-16 bottom-0 left-0 w-64 border-r py-4 px-3 overflow-y-auto ${
            isDark
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-200'
          }`}
        >
          <nav className="space-y-1.5 flex-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    active
                      ? isDark
                        ? 'bg-[#f5a90e] text-[#082175] font-bold shadow-xs'
                        : 'bg-[#082175] text-white font-bold shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#082175]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active
                          ? isDark
                            ? 'text-[#082175]'
                            : 'text-[#f5a90e]'
                          : 'text-[#9F8548]'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{item.label}</p>
                      <p
                        className={`text-[10px] truncate ${
                          active
                            ? isDark
                              ? 'text-[#082175]/80'
                              : 'text-slate-300'
                            : isDark
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>
                  {item.id === 'support' && openTicketsCount > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        active
                          ? isDark
                            ? 'bg-[#082175] text-white'
                            : 'bg-[#f5a90e] text-[#082175]'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {openTicketsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div
            className={`mt-4 pt-4 border-t text-[11px] px-2 space-y-1 ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <p className="font-semibold">Segurança RLS + SECURITY DEFINER</p>
            <p className="text-[10px]">Sessão verificada via public.is_admin()</p>
          </div>
        </aside>

        {/* Drawer Mobile */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className={`relative z-10 w-72 max-w-[85vw] flex flex-col h-full shadow-2xl ${
                isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
              }`}
            >
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <span className="font-extrabold text-sm text-[#082175] dark:text-white">
                  ccbrh · Admin
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Fechar menu"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                        active
                          ? 'bg-[#082175] text-white'
                          : isDark
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#f5a90e]" />
                        {item.label}
                      </span>
                      {item.id === 'support' && openTicketsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500 text-white">
                          {openTicketsCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Área de conteúdo */}
        <main className="flex-1 lg:pl-64 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
