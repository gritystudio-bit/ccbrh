import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AdminAuthState, AdminTabId, AdminTheme, AdminUserSession } from './types';
import { buildAdminTabPath, resolveAdminTabFromPath } from './routeUtils';
import { resolveAdminSession, signOutAdmin } from './services/adminService';
import { AdminLoginView } from './components/AdminLoginView';
import { AdminAccessDeniedView } from './components/AdminAccessDeniedView';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboardTab } from './components/AdminDashboardTab';
import { AdminTenantsTab } from './components/AdminTenantsTab';
import { AdminEmailsTab } from './components/AdminEmailsTab';
import { AdminPlansTab } from './components/AdminPlansTab';
import { AdminFlagsTab } from './components/AdminFlagsTab';
import { AdminSupportTab } from './components/AdminSupportTab';

const ADMIN_THEME_KEY = 'ccbrh_admin_theme';

export const AdminApp: React.FC = () => {
  const [authState, setAuthState] = useState<AdminAuthState>('loading');
  const [sessionUser, setSessionUser] = useState<AdminUserSession | null>(null);
  const [authDiagnosticError, setAuthDiagnosticError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabId>(() =>
    resolveAdminTabFromPath(typeof window !== 'undefined' ? window.location.pathname : '/admin')
  );
  const [theme, setTheme] = useState<AdminTheme>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_THEME_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  const verifySession = useCallback(async () => {
    setAuthState('loading');
    const result = await resolveAdminSession();
    if (!result.authenticated || !result.user) {
      setSessionUser(null);
      setAuthDiagnosticError(null);
      setAuthState('unauthenticated');
      return;
    }

    setSessionUser(result.user);
    setAuthDiagnosticError(result.error || null);
    setAuthState(result.user.isSuperadmin ? 'authorized' : 'forbidden');
  }, []);

  useEffect(() => {
    void verifySession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void verifySession();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [verifySession]);

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(resolveAdminTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectTab = (tab: AdminTabId) => {
    setActiveTab(tab);
    const nextPath = buildAdminTabPath(tab);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(ADMIN_THEME_KEY, next);
      } catch {
        // ignore storage restrictions
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setSessionUser(null);
    setAuthState('unauthenticated');
  };

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#f5a90e]" />
        <p className="text-sm font-medium">Validando sessão e permissão de superadministrador...</p>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return <AdminLoginView onSuccess={verifySession} />;
  }

  if (authState === 'forbidden' || !sessionUser) {
    return (
      <AdminAccessDeniedView
        userEmail={sessionUser?.email || 'conta atual'}
        diagnosticError={authDiagnosticError}
        onSwitchAccount={handleLogout}
      />
    );
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      user={sessionUser}
      theme={theme}
      onToggleTheme={handleToggleTheme}
      onLogout={handleLogout}
      openTicketsCount={openTicketsCount}
      maintenanceActive={maintenanceActive}
    >
      {activeTab === 'dashboard' && (
        <AdminDashboardTab
          theme={theme}
          onNavigateTab={handleSelectTab}
          onOpenTicketsChange={setOpenTicketsCount}
        />
      )}
      {activeTab === 'tenants' && <AdminTenantsTab theme={theme} />}
      {activeTab === 'emails' && <AdminEmailsTab theme={theme} adminUserId={sessionUser.id} />}
      {activeTab === 'plans' && <AdminPlansTab theme={theme} />}
      {activeTab === 'flags' && (
        <AdminFlagsTab
          theme={theme}
          adminUserId={sessionUser.id}
          onMaintenanceChange={setMaintenanceActive}
        />
      )}
      {activeTab === 'support' && (
        <AdminSupportTab theme={theme} onOpenTicketsChange={setOpenTicketsCount} />
      )}
    </AdminLayout>
  );
};

export default AdminApp;
