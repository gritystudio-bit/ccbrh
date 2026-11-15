import React, { useState } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  Users2,
  Briefcase,
  GitFork,
  FolderArchive,
  UserCheck,
  LogOut,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'companies'
  | 'recruitment'
  | 'vacancies'
  | 'employees'
  | 'documents'
  | 'portal';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout: () => void;
}

const CCBRH_LOGO_URL =
  'https://media.base44.com/images/public/6a52c7e1c55bcfd0507f8b31/8c104df66_CCB_Apresentacao3.png';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const {
    currentCompany,
    allCompanies,
    setCurrentTenantId,
    currentTenantId,
    metrics,
    authUser,
  } = useHireGrid();

  const [logoError, setLogoError] = useState(false);

  const formattedCnpjLabel = currentCompany.cnpj_root
    ? `Raiz ${currentCompany.cnpj_root.replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2.$3')}`
    : currentCompany.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'dashboard', label: 'Resumo Gerencial', icon: LayoutDashboard },
    {
      id: 'companies',
      label: 'Empresas Clientes',
      icon: Building2,
      count: allCompanies.length,
    },
    {
      id: 'recruitment',
      label: 'Recrutamento e Seleção',
      icon: Users2,
      count: metrics.candidatesInPipelineCount,
    },
    { id: 'vacancies', label: 'Vagas e Portais de Emprego', icon: Briefcase },
    { id: 'employees', label: 'Quadro de Funcionários e Organograma', icon: GitFork },
    { id: 'documents', label: 'Repositório de Documentos', icon: FolderArchive },
    { id: 'portal', label: 'Área de Envio do Candidato', icon: UserCheck },
  ];

  return (
    <header className="sticky top-0 z-40 shadow-xs">
      {/* Top Navy Brand Header matching ccbrh.com.br */}
      <div className="bg-[#082175] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Name */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-none group shrink-0 cursor-pointer"
            >
              {!logoError ? (
                <div className="h-10 rounded-lg bg-white px-2 py-1 flex items-center justify-center shrink-0">
                  <img
                    src={CCBRH_LOGO_URL}
                    alt="ccbrh"
                    className="h-full w-auto object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="h-10 px-3 rounded-lg bg-white text-[#082175] flex items-center justify-center shrink-0 font-extrabold text-sm tracking-tight border border-[#9F8548]">
                  ccbrh
                </div>
              )}

              <div className="hidden sm:block">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-extrabold tracking-tight text-white lowercase">
                    ccbrh
                  </span>
                  <span className="text-xs font-medium text-[#f5a90e]">
                    · Gestão de Pessoas & RH
                  </span>
                </div>
                {authUser && (
                  <p className="text-[11px] text-slate-300 leading-none mt-0.5 truncate max-w-[260px]">
                    {authUser.name} · {authUser.roleLabel}
                  </p>
                )}
              </div>
            </button>

            {/* Tenant Switcher & Account Controls on Navy */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
                <Building2 className="w-4 h-4 text-[#f5a90e] shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-300 font-medium leading-none">
                    Cliente Gerenciado ({formattedCnpjLabel})
                  </span>
                  <div className="relative inline-block mt-0.5">
                    <select
                      aria-label="Selecionar Empresa Cliente"
                      value={currentTenantId}
                      onChange={(e) => setCurrentTenantId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-5 appearance-none [&>option]:text-slate-900 [&>option]:bg-white max-w-[180px] sm:max-w-[230px] truncate"
                    >
                      {allCompanies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                          {comp.status === 'pending_review' ? ' (Pendente)' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-300 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Sair e voltar ao site"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-white/25 text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#f5a90e]" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crisp White Sub-Navigation Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                    isActive
                      ? 'border-[#9F8548] text-[#082175] bg-slate-50/70'
                      : 'border-transparent text-slate-600 hover:text-[#03416A] hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#9F8548]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="ml-0.5 text-[11px] font-mono tabular-nums font-bold text-[#9F8548]">
                      ({item.count})
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

