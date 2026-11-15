import React, { useState, useEffect } from 'react';
import { HireGridProvider, useHireGrid } from './context/HireGridContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { CompaniesModule } from './components/CompaniesModule';
import { RecruitmentPipelineModule } from './components/RecruitmentPipelineModule';
import { VacanciesModule } from './components/VacanciesModule';
import { OrganogramModule } from './components/OrganogramModule';
import { DocumentRepositoryModule } from './components/DocumentRepositoryModule';
import { CandidatePortalModule } from './components/CandidatePortalModule';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { CompanyRegistrationPage } from './components/CompanyRegistrationPage';
import { TalentRegistrationPage } from './components/TalentRegistrationPage';
import { PublicVacanciesPage } from './components/PublicVacanciesPage';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

type AppView =
  | 'landing'
  | 'login'
  | 'saas'
  | 'public_portal'
  | 'company_registration'
  | 'talent_registration'
  | 'public_vacancies';

function CcbrhMain() {
  const { currentCompany, authUser, logout, database, setCurrentTenantId } = useHireGrid();

  const [view, setView] = useState<AppView>(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (pathname === '/vagas') return 'public_vacancies';
    if (pathname === '/cadastro-empresa') return 'company_registration';
    if (pathname === '/cadastro-talento') return 'talent_registration';
    return authUser ? 'saas' : 'landing';
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [targetCandidateToken, setTargetCandidateToken] = useState<string | null>(null);

  // Guard SaaS view: if user logs out while in SaaS, return to landing
  useEffect(() => {
    if (view === 'saas' && !authUser) {
      setView('landing');
    }
  }, [view, authUser]);

  const handleOpenPortalForCandidate = (token: string) => {
    setTargetCandidateToken(token);
    setActiveTab('portal');
  };

  if (view === 'landing') {
    return (
      <LandingPage
        isAuthenticated={!!authUser}
        onOpenLogin={() => setView('login')}
        onGoToSaas={() => setView('saas')}
        onOpenCompanyRegistration={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('company_registration');
        }}
        onOpenTalentRegistration={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('talent_registration');
        }}
        onOpenPublicVacancies={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('public_vacancies');
        }}
        onOpenCandidatePortal={(token) => {
          if (token) {
            setTargetCandidateToken(token);
            const matched = database.candidates.find((c) => c.document_token === token);
            if (matched) {
              setCurrentTenantId(matched.tenant_id);
            }
          }
          setView('public_portal');
        }}
      />
    );
  }

  if (view === 'company_registration') {
    return <CompanyRegistrationPage onBackToLanding={() => setView('landing')} />;
  }

  if (view === 'talent_registration') {
    return (
      <TalentRegistrationPage
        onBackToLanding={() => setView('landing')}
        onViewVacancies={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('public_vacancies');
        }}
      />
    );
  }

  if (view === 'public_vacancies') {
    return (
      <PublicVacanciesPage
        onBackToLanding={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('landing');
        }}
        onOpenTalentRegistration={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('talent_registration');
        }}
        onOpenCompanyRegistration={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('company_registration');
        }}
        onOpenCandidatePortal={(token) => {
          if (token) {
            setTargetCandidateToken(token);
            const matched = database.candidates.find((c) => c.document_token === token);
            if (matched) {
              setCurrentTenantId(matched.tenant_id);
            }
          }
          setView('public_portal');
        }}
      />
    );
  }

  if (view === 'login') {
    return (
      <LoginPage
        onBackToLanding={() => setView('landing')}
        onLoginSuccess={() => {
          setActiveTab('dashboard');
          setView('saas');
        }}
        onOpenCandidatePortal={() => setView('public_portal')}
        onOpenCompanyRegistration={() => {
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          setView('company_registration');
        }}
      />
    );
  }

  if (view === 'public_portal') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-[#082175] text-white border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setView('landing')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#f5a90e] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao site ccbrh</span>
            </button>
            <span className="text-xs text-slate-300">
              Área Exclusiva de Envio de Documentos
            </span>
          </div>
        </header>
        <main className="flex-1 py-8">
          <CandidatePortalModule initialToken={targetCandidateToken} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#082175] selection:text-white">
      {/* Top Corporate Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => {
          logout();
          setView('landing');
        }}
      />

      {/* Main Module Content */}
      <main className="flex-1 pb-12">
        {activeTab === 'dashboard' && (
          <ExecutiveDashboard
            onNavigateTab={(tab) => {
              setActiveTab(tab);
            }}
          />
        )}
        {activeTab === 'companies' && (
          <CompaniesModule
            onSelectCompanyAndGoDashboard={(companyId) => {
              setCurrentTenantId(companyId);
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'recruitment' && (
          <RecruitmentPipelineModule onOpenPortal={handleOpenPortalForCandidate} />
        )}
        {activeTab === 'vacancies' && <VacanciesModule />}
        {activeTab === 'employees' && <OrganogramModule />}
        {activeTab === 'documents' && <DocumentRepositoryModule />}
        {activeTab === 'portal' && (
          <CandidatePortalModule initialToken={targetCandidateToken} />
        )}
      </main>

      {/* Corporate Institutional Footer matching ccbrh.com.br */}
      <footer className="bg-[#082175] text-white py-6 px-6 text-xs border-t border-[#03416A]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-extrabold text-sm tracking-tight lowercase text-white">
              ccbrh
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-200 font-medium">
              Gestão de Pessoas, Recrutamento e People Analytics
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5 text-[#f5a90e] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cliente em gestão: {currentCompany.name}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            <span>contato@ccbrh.com.br</span>
            <span aria-hidden="true">·</span>
            <span>www.ccbrh.com.br</span>
            <span aria-hidden="true">·</span>
            <span>Conformidade LGPD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <HireGridProvider>
      <CcbrhMain />
    </HireGridProvider>
  );
}

