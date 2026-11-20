import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { signInAdmin } from '../services/adminService';

interface AdminLoginViewProps {
  onSuccess: () => Promise<void>;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha de superadministrador.');
      return;
    }

    setLoading(true);
    const result = await signInAdmin(email, password);
    if (!result.success) {
      setLoading(false);
      setError(result.error || 'Falha na autenticação.');
      return;
    }

    await onSuccess();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="bg-[#082175] px-6 py-6 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#f5a90e]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#f5a90e]">
                  Portal Administrativo
                </p>
                <h1 className="text-lg font-extrabold text-white tracking-tight">
                  ccbrh · Superadmin
                </h1>
              </div>
            </div>
            <a
              href="/"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:text-[#f5a90e] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>SaaS</span>
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-200/85 leading-relaxed">
            Acesso isolado para gestão de tenants, faturamento, feature flags, campanhas e suporte.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
              E-mail administrativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ccbrh.com.br"
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f5a90e]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] pl-10 pr-12 py-2.5 text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f5a90e]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Mostrar ou ocultar senha"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs font-medium text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#f5a90e] hover:bg-[#e59b05] text-[#082175] text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span>{loading ? 'Validando credenciais...' : 'Entrar no Portal Admin'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
