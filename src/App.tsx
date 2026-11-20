import React, { Suspense, lazy, useState, useEffect } from 'react';
import { CcbProvider, useCcb } from './context/CcbContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { CompaniesModule } from './components/CompaniesModule';
import { RecruitmentPipelineModule } from './components/RecruitmentPipelineModule';
import { VacanciesModule } from './components/VacanciesModule';
import { OrganogramModule } from './components/OrganogramModule';
import { EmployeeProfileView } from './components/employees/EmployeeProfileView';
import { PayrollModule } from './components/PayrollModule';
import { LegalConsultationModule } from './components/legal/LegalConsultationModule';
import { SettingsModule } from './components/settings/SettingsModule';
import { SupportView } from './components/support/SupportView';
import { CandidatePortalModule } from './components/CandidatePortalModule';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { CompanyRegistrationPage } from './components/CompanyRegistrationPage';
import { TalentRegistrationPage } from './components/TalentRegistrationPage';
import { PublicVacanciesPage } from './components/PublicVacanciesPage';
import { isAdminPathname } from './admin/routeUtils';
import { getMaintenanceStatus } from './admin/services/adminService';
import type { MaintenanceStatus } from './admin/types';
import { AlertTriangle, ArrowLeft, Loader2, LogOut, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';

const AdminApp = lazy(() => import('./admin/AdminApp'));

type AppView =
  | 'landing'
  | 'login'
  | 'saas'
  | 'public_portal'
  | 'company_registration'
  | 'talent_registration'
  | 'public_vacancies';

function CcbrhMain() {
  const {
    currentCompany,
    authUser,
    authLoading,
    loadingData,
    dataError,
    refreshDatabase,
    logout,
    database,
    currentPayrollParameters,
    setCurrentTenantId,
    updateEmployee,
    uploadEmployeeDocument,
    updateDocumentStatus,
    deleteDocument,
    getDocumentSignedUrl,
    addEmployeeVacation,
  } = useCcb();

  const [view, setView] = useState<AppView>(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('portal') && hash.includes('token=')) return 'public_portal';
    if (pathname === '/vagas') return 'public_vacancies';
    if (pathname === '/cadastro-empresa') return 'company_registration';
    if (pathname === '/cadastro-talento') return 'talent_registration';
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [targetCandidateToken, setTargetCandidateToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('token=')) {
      const m = window.location.hash.match(/token=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    }
    return null;
  });

  // Sync initial authenticated view
  useEffect(() => {
    if (!authLoading && authUser && view === 'login') {
      setView('saas');
    }
  }, [authLoading, authUser, view]);

  // Guard SaaS view: if user logs out while in SaaS, return to landing
  useEffect(() => {
    if (!authLoading && view === 'saas' && !authUser) {
      setView('landing');
    }
  }, [authLoading, view, authUser]);

  const handleOpenPortalForCandidate = (token: string) => {
    setTargetCandidateToken(token);
    setActiveTab('portal');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#082175]" />
        <p className="text-sm font-medium">Conectando ao ambiente seguro...</p>
      </div>
    );
  }

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
          <CandidatePortalModule initialToken={targetCandidateToken} isPublic />
        </main>
      </div>
    );
  }

  // Acesso Exclusivo ao Perfil Individual do Colaborador (quando o usuário logado possui ficha de colaborador vinculada ao e-mail e perfil de colaborador)
  const selfServiceEmployee =
    authUser &&
    (authUser.roleLabel.toLowerCase().includes('colaborador') ||
      authUser.roleLabel.toLowerCase().includes('perfil') ||
      !authUser.email.toLowerCase().endsWith('@ccbrh.com.br'))
      ? database.employees.find(
          (e) => e.email.trim().toLowerCase() === authUser.email.trim().toLowerCase()
        ) || null
      : null;

  if (selfServiceEmployee) {
    const empCompany =
      database.companies.find((c) => c.id === selfServiceEmployee.tenant_id) || currentCompany;
    const empJob = database.jobs.find((j) => j.id === selfServiceEmployee.job_id);
    const empManager = database.employees.find((m) => m.id === selfServiceEmployee.reports_to);
    const empDocs = database.documents.filter((d) => d.employee_id === selfServiceEmployee.id);
    const empPayslips = database.payrollEntries.filter(
      (p) => p.employee_id === selfServiceEmployee.id
    );
    const empVacations = database.employeeVacations.filter(
      (v) => v.employee_id === selfServiceEmployee.id
    );
    const empBenefits = database.employeeBenefits.filter(
      (b) => b.employee_id === selfServiceEmployee.id
    );

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
        <header className="bg-[#082175] text-white border-b border-white/10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white text-[#082175] flex items-center justify-center font-extrabold text-xs">
                CCB
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">
                  Portal do Colaborador · {empCompany?.name || 'ccbrh'}
                </p>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#f5a90e]" />
                  <span>Acesso Exclusivo ao Perfil Individual & Recibos</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await logout();
                setView('landing');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>Sair do Meu Perfil</span>
            </button>
          </div>
        </header>

        <main className="flex-1 pb-12">
          <EmployeeProfileView
            employee={selfServiceEmployee}
            job={empJob}
            manager={empManager}
            documents={empDocs}
            payrollEntries={empPayslips}
            vacations={empVacations}
            benefits={empBenefits}
            payrollParameters={currentPayrollParameters}
            company={empCompany}
            isSelfServiceView
            onBack={() => {}}
            onEditContractModal={() => {}}
            onSaveEmployeePatch={async (patch) => {
              await updateEmployee(selfServiceEmployee.id, patch);
            }}
            onUploadDocument={(docType, file) =>
              uploadEmployeeDocument(selfServiceEmployee.id, docType, file)
            }
            onUpdateDocumentStatus={(docId, status) => updateDocumentStatus(docId, status)}
            onDeleteDocument={(docId, storagePath) => deleteDocument(docId, storagePath)}
            onOpenDocument={async (storagePath) => {
              const url = await getDocumentSignedUrl(storagePath);
              if (url) window.open(url, '_blank', 'noopener,noreferrer');
            }}
            onCreateVacation={addEmployeeVacation}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-[#082175] selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onLogout={async () => {
          await logout();
          setView('landing');
        }}
      />

      <main
        className={`flex-1 pb-12 transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {dataError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Erro ao sincronizar informações: {dataError}</span>
              </div>
              <button
                type="button"
                onClick={() => refreshDatabase()}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-700 text-white font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tentar novamente</span>
              </button>
            </div>
          </div>
        )}

        {loadingData && database.companies.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#082175]" />
            <span className="text-sm font-medium">Carregando informações da empresa...</span>
          </div>
        ) : !currentCompany &&
          activeTab !== 'companies' &&
          activeTab !== 'settings' &&
          activeTab !== 'support' ? (
          <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-3">
            <p className="text-base font-bold text-[#082175]">Nenhuma empresa cliente cadastrada</p>
            <p className="text-xs text-slate-500">
              Cadastre uma empresa cliente para começar a gerenciar vagas, colaboradores e folha.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className="px-4 py-2 rounded-lg bg-[#082175] text-white text-xs font-semibold cursor-pointer"
            >
              Ir para Empresas Clientes
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <ExecutiveDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
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
            {activeTab === 'payroll' && <PayrollModule />}
            {activeTab === 'legal' && <LegalConsultationModule />}
            {activeTab === 'settings' && <SettingsModule />}
            {activeTab === 'support' && <SupportView />}
            {activeTab === 'portal' && (
              <CandidatePortalModule initialToken={targetCandidateToken} />
            )}
          </>
        )}
      </main>

      <footer
        className={`bg-[#082175] text-white py-5 text-xs border-t border-[#03416A] transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-extrabold text-sm tracking-tight lowercase text-white">
              ccbrh
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-slate-200 font-medium">
              Gestão de Pessoas, Recrutamento e People Analytics
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            <span>Conformidade LGPD · Ambiente Seguro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-[#082175] text-[#f5a90e] flex items-center justify-center mx-auto">
          <Wrench className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
            Manutenção Programada · ccbrh
          </p>
          <h1 className="text-2xl font-extrabold text-[#082175]">
            Estamos atualizando a plataforma
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#f5a90e]" />
            <span>Verificar novamente</span>
          </button>
          <a
            href="/admin"
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-[#082175]"
          >
            <ShieldCheck className="w-4 h-4 text-[#9F8548]" />
            <span>Acesso Administrativo</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [maintenance, setMaintenance] = useState<MaintenanceStatus>({
    enabled: false,
    message: null,
    updated_at: null,
  });

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminRoute = isAdminPathname(pathname);

  useEffect(() => {
    if (isAdminRoute) return;
    let active = true;
    void getMaintenanceStatus().then((status) => {
      if (active) setMaintenance(status);
    });
    return () => {
      active = false;
    };
  }, [isAdminRoute]);

  // Portal Administrativo (/admin e /admin/*) carregado via React.lazy e isolado do app principal/manutenção
  if (isAdminRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3 font-sans">
            <Loader2 className="w-8 h-8 animate-spin text-[#f5a90e]" />
            <p className="text-sm font-medium">Carregando Portal Administrativo...</p>
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    );
  }

  if (maintenance.enabled) {
    return (
      <MaintenanceScreen
        message={
          maintenance.message ||
          'Estamos realizando uma manutenção programada para melhorar a plataforma CCBRH. Voltamos em breve.'
        }
      />
    );
  }

  return (
    <CcbProvider>
      <CcbrhMain />
    </CcbProvider>
  );
}
