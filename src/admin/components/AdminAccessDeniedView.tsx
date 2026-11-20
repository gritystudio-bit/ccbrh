import React from 'react';
import { ArrowLeft, LogOut, ShieldAlert } from 'lucide-react';

interface AdminAccessDeniedViewProps {
  userEmail: string;
  diagnosticError?: string | null;
  onSwitchAccount: () => Promise<void>;
}

export const AdminAccessDeniedView: React.FC<AdminAccessDeniedViewProps> = ({
  userEmail,
  diagnosticError,
  onSwitchAccount,
}) => {
  const isMissingMigration = Boolean(
    diagnosticError &&
      (diagnosticError.includes('is_superadmin') || diagnosticError.includes('42703'))
  );
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-red-900/60 bg-slate-900 shadow-2xl p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
            HTTP 403 · Acesso Negado
          </p>
          <h1 className="text-2xl font-bold text-white">
            Permissão de Superadministrador obrigatória
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            A conta <span className="font-semibold text-slate-200">{userEmail}</span> está
            autenticada, mas não possui a flag <code className="font-mono text-[#f5a90e]">is_superadmin = true</code>{' '}
            habilitada em <code className="font-mono text-slate-300">user_profiles</code>.
          </p>
          {isMissingMigration && (
            <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-left text-xs text-amber-200 leading-relaxed">
              <p className="font-bold text-amber-300">Migration pendente no banco de dados</p>
              <p className="mt-1">
                A coluna <code className="font-mono">user_profiles.is_superadmin</code> ainda não
                existe no projeto Supabase conectado. Execute{' '}
                <code className="font-mono">supabase/migrations/20261120_support_and_admin_portal.sql</code>{' '}
                no SQL Editor do Supabase e recarregue esta página.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void onSwitchAccount()}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#f5a90e] hover:bg-[#e59b05] text-[#082175] text-sm font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Trocar de conta</span>
          </button>

          <a
            href="/"
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao SaaS</span>
          </a>
        </div>
      </div>
    </div>
  );
};
