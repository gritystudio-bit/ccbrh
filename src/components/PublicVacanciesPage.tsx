import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import { Vacancy } from '../types/database';
import { lookupCep } from '../utils/geocoding';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Link2,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';

interface PublicVacanciesPageProps {
  onBackToLanding: () => void;
  onOpenTalentRegistration: () => void;
  onOpenCompanyRegistration: () => void;
  onOpenCandidatePortal: (token?: string) => void;
}

const CCB_LOGO_URL =
  'https://media.base44.com/images/public/6a52c7e1c55bcfd0507f8b31/8c104df66_CCB_Apresentacao3.png';

const SOURCE_LABELS: Record<string, string> = {
  internal: 'Vaga Direta CCB',
  linkedin: 'LinkedIn',
  indeed: 'Indeed Brasil',
  company_form: 'Empresa Parceira',
};

export const PublicVacanciesPage: React.FC<PublicVacanciesPageProps> = ({
  onBackToLanding,
  onOpenTalentRegistration,
  onOpenCompanyRegistration,
  onOpenCandidatePortal,
}) => {
  const { database, loadingData, applyFromLanding } = useCcb();

  const [logoError, setLogoError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState('all');

  // Application Modal State
  const [applyingVacancy, setApplyingVacancy] = useState<Vacancy | null>(null);
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candLinkedin, setCandLinkedin] = useState('');
  const [candCep, setCandCep] = useState('');
  const [candEndereco, setCandEndereco] = useState('');
  const [candNumero, setCandNumero] = useState('');
  const [candComplemento, setCandComplemento] = useState('');
  const [candBairro, setCandBairro] = useState('');
  const [candCidade, setCandCidade] = useState('');
  const [candEstado, setCandEstado] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [candResumeFile, setCandResumeFile] = useState<File | null>(null);
  const [candResumeName, setCandResumeName] = useState('');
  const [candError, setCandError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [appliedVacancyIds, setAppliedVacancyIds] = useState<string[]>([]);

  const openVacancies = database.vacancies.filter((v) => {
    if (v.status !== 'open') return false;
    const comp = database.companies.find((c) => c.id === v.tenant_id);
    return !comp || (comp.status !== 'inactive' && comp.status !== 'pending_review');
  });

  const areas = Array.from(
    new Set(
      openVacancies
        .map((v) => {
          const job = database.jobs.find((j) => j.id === v.job_id);
          return job?.department || v.area || null;
        })
        .filter((d): d is string => Boolean(d))
    )
  );

  const activeCompaniesWithVacancies = database.companies.filter((c) =>
    openVacancies.some((v) => v.tenant_id === c.id)
  );

  const filteredVacancies = openVacancies.filter((vac) => {
    const company = database.companies.find((c) => c.id === vac.tenant_id);
    const job = database.jobs.find((j) => j.id === vac.job_id);
    const branch = database.branches.find((b) => b.id === vac.branch_id);

    if (selectedArea !== 'all' && (job?.department || vac.area) !== selectedArea) return false;
    if (selectedCompanyId !== 'all' && vac.tenant_id !== selectedCompanyId) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = vac.title.toLowerCase().includes(q);
      const matchCompany = (company?.name || '').toLowerCase().includes(q);
      const matchDept = (job?.department || vac.area || '').toLowerCase().includes(q);
      const matchDesc = (vac.description || '').toLowerCase().includes(q);
      const matchBranch = (branch?.label || '').toLowerCase().includes(q);
      const matchCity = (vac.city || branch?.cidade || company?.cidade || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCompany && !matchDept && !matchDesc && !matchBranch && !matchCity) {
        return false;
      }
    }

    return true;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleOpenApply = (vac: Vacancy) => {
    setApplyingVacancy(vac);
    setCandName('');
    setCandEmail('');
    setCandPhone('');
    setCandLinkedin('');
    setCandCep('');
    setCandEndereco('');
    setCandNumero('');
    setCandComplemento('');
    setCandBairro('');
    setCandCidade('');
    setCandEstado('');
    setCandResumeFile(null);
    setCandResumeName('');
    setCandError(null);
    setCreatedToken(null);
  };

  const handleCepBlur = async () => {
    const digits = candCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    const info = await lookupCep(digits);
    setCepLoading(false);
    if (info) {
      if (info.logradouro) setCandEndereco(info.logradouro);
      if (info.bairro) setCandBairro(info.bairro);
      if (info.localidade) setCandCidade(info.localidade);
      if (info.uf) setCandEstado(info.uf);
    }
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandResumeFile(file);
    setCandResumeName(file.name);
    setCandError(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setCandError(null);

    if (!applyingVacancy) return;
    if (!candName.trim() || !candEmail.trim() || !candPhone.trim()) {
      setCandError('Preencha nome completo, e-mail e telefone para enviar sua candidatura.');
      return;
    }

    if (!candEndereco.trim() || !candBairro.trim() || !candCidade.trim() || !candEstado.trim()) {
      setCandError('Informe seu endereço completo (Logradouro, Bairro, Cidade e UF).');
      return;
    }

    if (!candResumeName.trim()) {
      setCandError('Anexe seu currículo (PDF, DOC ou DOCX) para concluir a candidatura.');
      return;
    }

    const normalizedLinkedin = candLinkedin.trim()
      ? candLinkedin.trim().startsWith('http')
        ? candLinkedin.trim()
        : `https://${candLinkedin.trim()}`
      : '';

    setSubmitting(true);
    try {
      const candidate = await applyFromLanding({
        vacancyId: applyingVacancy.id,
        tenantId: applyingVacancy.tenant_id,
        fullName: candName.trim(),
        email: candEmail.trim(),
        phone: candPhone.trim(),
        linkedinUrl: normalizedLinkedin || undefined,
        resumeFile: candResumeFile,
        resumeFileName: candResumeName.trim(),
        cep: candCep.trim() || undefined,
        endereco: candEndereco.trim(),
        numero: candNumero.trim() || undefined,
        complemento: candComplemento.trim() || undefined,
        bairro: candBairro.trim(),
        cidade: candCidade.trim(),
        estado: candEstado.trim().toUpperCase(),
      });

      setAppliedVacancyIds((prev) => [...prev, applyingVacancy.id]);
      setCreatedToken(candidate.document_token);
    } catch (err: unknown) {
      setCandError(
        err instanceof Error ? err.message : 'Não foi possível enviar sua candidatura. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#082175] selection:text-white">
      {/* Institutional Top Header */}
      <header className="sticky top-0 z-50 bg-[#082175] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToLanding}
              className="focus:outline-none cursor-pointer"
            >
              {!logoError ? (
                <img
                  src={CCB_LOGO_URL}
                  alt="CCB Soluções em RH"
                  className="h-10 w-auto rounded bg-white px-2 py-1 object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="px-3 py-1 rounded bg-white text-[#082175] font-extrabold text-sm lowercase">
                  ccbrh
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-200 hover:text-[#f5a90e] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao início</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenCompanyRegistration}
              className="hidden sm:inline-flex px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border border-white/40 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Para Empresas
            </button>
            <button
              type="button"
              onClick={onOpenTalentRegistration}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#f5a90e] text-white hover:bg-[#d4940c] transition-colors cursor-pointer"
            >
              Banco de Talentos
            </button>
          </div>
        </div>
      </header>

      {/* Navy Page Hero Banner */}
      <div className="bg-[#082175] text-white py-14 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[#f5a90e] text-xs font-semibold uppercase tracking-wider">
            Oportunidades Conectadas à Plataforma CCB
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold mt-2 mb-3">Painel de Vagas</h1>
          <p className="text-slate-200 max-w-2xl text-sm sm:text-base leading-relaxed">
            Confira todas as oportunidades abertas nas empresas atendidas pela ccbrh e envie sua
            candidatura diretamente para o processo seletivo da empresa contratante.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cargo, área, unidade ou cidade..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#082175]"
            />
          </div>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            aria-label="Filtrar por área"
            className="w-full md:w-52 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#082175]"
          >
            <option value="all">Todas as áreas</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            aria-label="Filtrar por empresa"
            className="w-full md:w-56 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#082175]"
          >
            <option value="all">Todas as empresas</option>
            {activeCompaniesWithVacancies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Talent Bank CTA Banner */}
        <div className="mb-8 p-4 rounded-xl bg-[#082175]/5 border border-[#082175]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#9F8548] shrink-0" />
            <p className="text-sm text-slate-700">
              Não encontrou a vaga ideal agora? Cadastre seu currículo para futuras oportunidades
              nas empresas parceiras.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTalentRegistration}
            className="px-4 py-2 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Quero fazer parte do Banco de Talentos
          </button>
        </div>

        {/* Vacancies Grid */}
        {loadingData ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#082175]" />
            <p className="text-sm text-slate-500">Carregando vagas disponíveis...</p>
          </div>
        ) : filteredVacancies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-semibold">Nenhuma vaga encontrada com os filtros atuais.</p>
            <p className="text-sm text-slate-400 mt-1">
              Limpe os filtros ou cadastre seu perfil em nosso Banco de Talentos.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredVacancies.map((vac) => {
              const company = database.companies.find((c) => c.id === vac.tenant_id);
              const job = database.jobs.find((j) => j.id === vac.job_id);
              const branch = database.branches.find((b) => b.id === vac.branch_id);
              const alreadyApplied = appliedVacancyIds.includes(vac.id);
              const cityLabel = vac.city || branch?.cidade || company?.cidade;
              const stateLabel = vac.state || branch?.estado || company?.estado;
              const locationText = [cityLabel, stateLabel].filter(Boolean).join('/');
              const positionsCount = vac.vacancies_count || 1;
              const showSalary = vac.show_salary !== false && Boolean(job?.base_salary || vac.salary);
              const salaryValue = Number(job?.base_salary || vac.salary || 0);

              return (
                <div
                  key={vac.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col hover:border-[#082175]/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#03416A]">{vac.title}</h2>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-500">
                        {company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-[#082175]" />
                            <span>{company.name}</span>
                          </span>
                        )}
                        {locationText && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#9F8548]" />
                            <span>{locationText}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {showSalary && salaryValue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#9F8548]/10 text-[#9F8548] border border-[#9F8548]/20 text-xs font-bold font-mono whitespace-nowrap shrink-0">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{formatCurrency(salaryValue)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold whitespace-nowrap shrink-0">
                        A combinar
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(job?.department || vac.area) && (
                      <span className="px-2.5 py-0.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600">
                        {job?.department || vac.area}
                      </span>
                    )}
                    {branch && (
                      <span className="px-2.5 py-0.5 rounded-md border border-[#082175]/20 bg-[#082175]/5 text-xs font-medium text-[#082175]">
                        {branch.label}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600 uppercase">
                      {vac.contract_type || 'CLT'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600">
                      {positionsCount} {positionsCount === 1 ? 'vaga' : 'vagas'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md border border-slate-200 text-xs font-medium text-slate-600">
                      {SOURCE_LABELS[vac.api_source] || 'Vaga CCB'}
                    </span>
                  </div>

                  {vac.description && (
                    <p className="text-sm text-slate-600 mb-5 line-clamp-3 leading-relaxed">
                      {vac.description}
                    </p>
                  )}

                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      Processo conduzido pela ccbrh
                    </span>

                    {alreadyApplied ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 border border-green-200 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Candidatura Enviada</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenApply(vac)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] transition-colors cursor-pointer"
                      >
                        <span>Candidatar-se</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-[#082175] text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <span>ccbrh · CCB Soluções em Recursos Humanos</span>
          <span>Vagas atualizadas em tempo real</span>
        </div>
      </footer>

      {/* Candidatura Modal */}
      {applyingVacancy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-[#9F8548] uppercase tracking-wide">
                  Candidatura Direta · ccbrh
                </span>
                <h3 className="text-lg font-bold text-[#03416A] mt-0.5">
                  {applyingVacancy.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {database.companies.find((c) => c.id === applyingVacancy.tenant_id)?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingVacancy(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdToken ? (
              <div className="mt-5 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span>Candidatura registrada com sucesso!</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Seu currículo e localização foram recebidos no processo seletivo desta empresa.
                    Caso deseje enviar outros documentos adicionais, utilize a chave abaixo:
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono break-all text-slate-700">
                  {createdToken}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const token = createdToken;
                      setApplyingVacancy(null);
                      onOpenCandidatePortal(token);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Enviar Documentos Agora</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyingVacancy(null)}
                    className="px-4 py-2.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Nome completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={candName}
                    onChange={(e) => setCandName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#03416A] mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={candEmail}
                      onChange={(e) => setCandEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#03416A] mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      value={candPhone}
                      onChange={(e) => setCandPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    LinkedIn
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={candLinkedin}
                      onChange={(e) => setCandLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/seuperfil"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#082175] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#9F8548]" />
                      <span>Endereço Residencial *</span>
                    </span>
                    {cepLoading && (
                      <span className="text-[11px] text-[#03416A] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Buscando CEP...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={candCep}
                        onChange={(e) => setCandCep(e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Logradouro (Rua / Av.) *
                      </label>
                      <input
                        type="text"
                        required
                        value={candEndereco}
                        onChange={(e) => setCandEndereco(e.target.value)}
                        placeholder="Rua das Flores"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Número
                      </label>
                      <input
                        type="text"
                        value={candNumero}
                        onChange={(e) => setCandNumero(e.target.value)}
                        placeholder="123"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={candComplemento}
                        onChange={(e) => setCandComplemento(e.target.value)}
                        placeholder="Apto, bloco..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Bairro *
                      </label>
                      <input
                        type="text"
                        required
                        value={candBairro}
                        onChange={(e) => setCandBairro(e.target.value)}
                        placeholder="Bairro"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        required
                        value={candCidade}
                        onChange={(e) => setCandCidade(e.target.value)}
                        placeholder="São Paulo"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        UF *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={candEstado}
                        onChange={(e) => setCandEstado(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175] uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    Currículo (PDF, DOC ou DOCX) *
                  </label>
                  <label
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      candResumeName
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                        : 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {candResumeName ? (
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Upload className="w-4 h-4 text-[#082175] shrink-0" />
                      )}
                      <span className="text-xs font-medium truncate">
                        {candResumeName ? candResumeName : 'Clique para anexar seu currículo *'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#082175] shrink-0">
                      {candResumeName ? 'Trocar' : 'Selecionar'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {candError && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    {candError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setApplyingVacancy(null)}
                    className="px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{submitting ? 'Enviando...' : 'Confirmar Candidatura'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
