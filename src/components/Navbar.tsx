import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users2,
  Briefcase,
  Users,
  UserCheck,
  Calculator,
  Scale,
  Settings,
  LifeBuoy,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'companies'
  | 'recruitment'
  | 'vacancies'
  | 'employees'
  | 'payroll'
  | 'legal'
  | 'portal'
  | 'settings'
  | 'support';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const CCBRH_LOGO_URL =
  'https://media.base44.com/images/public/6a52c7e1c55bcfd0507f8b31/8c104df66_CCB_Apresentacao3.png';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}) => {
  const {
    currentCompany,
    allCompanies,
    setCurrentTenantId,
    currentTenantId,
    metrics,
    authUser,
  } = useCcb();

  const [logoError, setLogoError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formattedCnpjLabel = currentCompany?.cnpj_root
    ? `Raiz ${currentCompany.cnpj_root.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3')}`
    : (currentCompany?.cnpj || '').replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      ) || 'Sem CNPJ';

  const navSections: Array<{
    group: string;
    items: Array<{
      id: ActiveTab;
      label: string;
      icon: React.FC<{ className?: string }>;
      count?: number;
    }>;
  }> = [
    {
      group: 'Visão Geral',
      items: [
        { id: 'dashboard', label: 'Resumo Gerencial', icon: LayoutDashboard },
        {
          id: 'companies',
          label: 'Empresas Clientes',
          icon: Building2,
          count: allCompanies.length,
        },
      ],
    },
    {
      group: 'Atração & Seleção',
      items: [
        { id: 'vacancies', label: 'Vagas e Portais', icon: Briefcase },
        {
          id: 'recruitment',
          label: 'Recrutamento e Seleção',
          icon: Users2,
          count: metrics.candidatesInPipelineCount,
        },
        { id: 'portal', label: 'Portal do Candidato', icon: UserCheck },
      ],
    },
    {
      group: 'Departamento Pessoal',
      items: [
        {
          id: 'employees',
          label: 'Funcionários',
          icon: Users,
          count: metrics.totalHeadcount,
        },
        { id: 'payroll', label: 'Folha de Pagamento', icon: Calculator },
      ],
    },
    {
      group: 'Compliance & Leis',
      items: [
        {
          id: 'legal',
          label: 'Consulta Jurídica Trabalhista',
          icon: Scale,
        },
      ],
    },
    {
      group: 'Administração',
      items: [
        {
          id: 'settings',
          label: 'Configurações',
          icon: Settings,
        },
        {
          id: 'support',
          label: 'Suporte',
          icon: LifeBuoy,
        },
      ],
    },
  ];

  const allItems = navSections.flatMap((s) => s.items);
  const activeItem = allItems.find((i) => i.id === activeTab) || allItems[0];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-[#082175] text-white border-r border-white/10 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Brand Top */}
        <div className="h-16 px-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer overflow-hidden"
          >
            {!logoError ? (
              <div className="h-9 w-9 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                <img
                  src={CCBRH_LOGO_URL}
                  alt="ccbrh"
                  className="h-full w-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="h-9 w-9 rounded-lg bg-white text-[#082175] flex items-center justify-center shrink-0 font-extrabold text-xs border border-[#9F8548]">
                ccb
              </div>
            )}

            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-white lowercase">
                    ccbrh
                  </span>
                  <span className="text-[11px] font-semibold text-[#f5a90e] truncate">
                    · Gestão RH
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 truncate">
                  Plataforma Corporativa
                </p>
              </div>
            )}
          </button>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 shrink-0 cursor-pointer"
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 scrollbar-none">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {section.group}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#f5a90e] text-[#082175] shadow-xs font-bold'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#082175]' : 'text-[#f5a90e]'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && typeof item.count === 'number' && item.count > 0 && (
                      <span
                        className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isActive
                            ? 'bg-[#082175] text-white'
                            : 'bg-white/15 text-[#f5a90e]'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom User & Logout */}
        <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
          {authUser && (
            <button
              type="button"
              onClick={() => handleSelectTab('settings')}
              title="Abrir Configurações do Perfil e Usuários"
              className={`w-full text-left px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center ${
                collapsed ? 'justify-center' : 'justify-between gap-2.5'
              } cursor-pointer`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 text-[#f5a90e] font-bold text-[11px] flex items-center justify-center shrink-0 overflow-hidden">
                  {authUser.avatarUrl ? (
                    <img
                      src={authUser.avatarUrl}
                      alt={authUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (authUser.name || 'AD')
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  )}
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{authUser.name}</p>
                    <p className="text-[10px] text-[#f5a90e] truncate">{authUser.roleLabel}</p>
                  </div>
                )}
              </div>
              {!collapsed && <Settings className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="Sair e voltar ao site"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center' : 'justify-center gap-2'
            } px-3 py-2 rounded-xl text-xs font-semibold border border-white/20 text-white hover:bg-white/10 transition-colors cursor-pointer`}
          >
            <LogOut className="w-4 h-4 text-[#f5a90e] shrink-0" />
            {!collapsed && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* Top Header Bar (Desktop & Mobile) */}
      <header
        className={`sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs transition-all duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Mobile Hamburger + Current Module Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu de navegação"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-[#082175] hover:bg-slate-50 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              {React.createElement(activeItem.icon, {
                className: 'w-4 h-4 text-[#f5a90e] shrink-0 hidden sm:block',
              })}
              <span className="font-bold text-sm sm:text-base text-[#082175] truncate">
                {activeItem.label}
              </span>
            </div>
          </div>

          {/* Right: Active Client Selector + Mobile Logout */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5">
              <Building2 className="w-4 h-4 text-[#082175] shrink-0" />
              <div className="flex flex-col text-left">
                <span className="hidden sm:inline text-[10px] text-slate-500 font-medium leading-none">
                  Cliente ({formattedCnpjLabel})
                </span>
                <div className="relative inline-block">
                  <select
                    aria-label="Selecionar Empresa Cliente"
                    value={currentTenantId}
                    onChange={(e) => setCurrentTenantId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#082175] focus:outline-none cursor-pointer pr-5 appearance-none max-w-[140px] sm:max-w-[230px] truncate"
                  >
                    {allCompanies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                        {comp.status === 'pending_review' ? ' (Pendente)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sair"
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-[#082175] hover:bg-slate-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#082175] text-white flex flex-col h-full z-10 shadow-2xl">
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white text-[#082175] flex items-center justify-center font-extrabold text-xs">
                  ccb
                </div>
                <div>
                  <span className="text-base font-extrabold lowercase">ccbrh</span>
                  <p className="text-[10px] text-[#f5a90e]">Gestão de Pessoas & DP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
              {navSections.map((section) => (
                <div key={section.group} className="space-y-1">
                  <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {section.group}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-[#f5a90e] text-[#082175] font-bold'
                            : 'text-slate-200 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 ${
                              isActive ? 'text-[#082175]' : 'text-[#f5a90e]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {typeof item.count === 'number' && item.count > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isActive
                                ? 'bg-[#082175] text-white'
                                : 'bg-white/15 text-[#f5a90e]'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-white/10 space-y-2">
              {authUser && (
                <div className="px-2 py-1 text-xs">
                  <p className="font-bold text-white">{authUser.name}</p>
                  <p className="text-[11px] text-[#f5a90e]">{authUser.roleLabel}</p>
                </div>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                <LogOut className="w-4 h-4 text-[#f5a90e]" />
                <span>Sair do Sistema</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
