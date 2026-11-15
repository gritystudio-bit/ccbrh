import React, { useState } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserCheck,
} from 'lucide-react';

interface LoginPageProps {
  onBackToLanding: () => void;
  onLoginSuccess: () => void;
  onOpenCandidatePortal: () => void;
  onOpenCompanyRegistration: () => void;
}

const CCB_LOGO_URL =
  'https://media.base44.com/images/public/6a52c7e1c55bcfd0507f8b31/8c104df66_CCB_Apresentacao3.png';

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToLanding,
  onLoginSuccess,
  onOpenCandidatePortal,
  onOpenCompanyRegistration,
}) => {
  const { login } = useHireGrid();

  const [logoError, setLogoError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Preencha seu e-mail corporativo e senha.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error || 'Não foi possível entrar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans selection:bg-[#082175] selection:text-white">
      {/* Left Institutional Brandbook Panel (#082175) */}
      <div className="lg:w-[44%] bg-[#082175] text-white p-8 sm:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBackToLanding}
              className="focus:outline-none cursor-pointer"
            >
              {!logoError ? (
                <img
                  src={CCB_LOGO_URL}
                  alt="ccbrh"
                  className="h-12 w-auto rounded bg-white px-2.5 py-1 object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="px-3 py-1.5 rounded bg-white text-[#082175] font-extrabold text-base lowercase">
                  ccbrh
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-[#f5a90e] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao site</span>
            </button>
          </div>

          <div className="mt-12 lg:mt-16 max-w-md">
            <span className="text-[#f5a90e] text-xs font-semibold uppercase tracking-wider">
              Acesso Exclusivo · Equipe CCB
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight text-white text-balance">
              Gestão de Pessoas, Recrutamento e Folha para cada Empresa Cliente.
            </h1>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Plataforma interna da ccbrh exclusiva para a equipe de consultoria e gestão de
              pessoas administrar as empresas cadastradas com dados, vagas e folha totalmente
              separados.
            </p>

            <div className="mt-8 space-y-3.5 text-sm text-slate-200">
              {[
                'Resumo Gerencial com indicadores de folha e quadro ativo por empresa',
                'Recrutamento e Seleção em fluxo conectado às vagas de cada cliente',
                'Repositório documental com links temporários de admissão',
                'Dados isolados por CNPJ em conformidade com a LGPD',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#f5a90e] shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>ccbrh · Soluções em Recursos Humanos</span>
          <span>contato@ccbrh.com.br</span>
        </div>
      </div>

      {/* Right Login Workspace */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16 bg-white">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-6">
            <span className="text-xs font-semibold text-[#9F8548] uppercase tracking-wide">
              Área Restrita · Consultoria ccbrh
            </span>
            <h2 className="text-2xl font-bold text-[#03416A] mt-1">Acesse o painel CCB</h2>
            <p className="text-sm text-slate-500 mt-1">
              Entre com seu e-mail corporativo da CCB para gerenciar as empresas clientes
              cadastradas, colaboradores e processos seletivos.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1.5">
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com.br"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#082175]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#03416A] mb-1.5">
                Senha de acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-[#082175]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Mostrar ou ocultar senha"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#082175] text-white text-sm font-semibold hover:bg-[#0a2a8a] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? 'Autenticando...' : 'Entrar na Plataforma'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Institutional Company Registration & Candidate self-service links */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-center">
            <button
              type="button"
              onClick={onOpenCompanyRegistration}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-[#082175] text-xs font-semibold text-[#03416A] hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#082175]" />
              <span>Ainda não é cliente? Cadastrar Empresa e Vagas</span>
            </button>

            <button
              type="button"
              onClick={onOpenCandidatePortal}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#03416A] hover:text-[#9F8548] transition-colors cursor-pointer pt-1"
            >
              <UserCheck className="w-4 h-4 text-[#9F8548]" />
              <span>É candidato e recebeu um link? Acessar Área de Envio de Documentos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
