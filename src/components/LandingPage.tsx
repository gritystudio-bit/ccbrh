import React, { useState } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  FileText,
  GraduationCap,
  Link2,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  Quote,
  Search,
  Sparkles,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
  Globe,
} from 'lucide-react';
import { Vacancy } from '../types/database';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenCandidatePortal: (token?: string) => void;
  onOpenCompanyRegistration: () => void;
  onOpenTalentRegistration: () => void;
  onOpenPublicVacancies: () => void;
  isAuthenticated: boolean;
  onGoToSaas: () => void;
}

const CCB_LOGO_URL =
  'https://media.base44.com/images/public/6a52c7e1c55bcfd0507f8b31/8c104df66_CCB_Apresentacao3.png';

const HERO_IMAGE = '/src/assets/images/hero_ccb_team_1794748843429.jpg';
const CASE_IMAGE = '/src/assets/images/case_emporio_retail_1794748843298.jpg';
const PARTNER_CRISTINA_IMAGE = '/src/assets/images/partner_cristina_1794748843281.jpg';
const PARTNER_DEUSA_IMAGE = '/src/assets/images/partner_deusa_1794748844320.jpg';
const BLOG_STRATEGY_IMAGE = '/src/assets/images/blog_hr_strategy_1794748845057.jpg';

interface BlogArticle {
  title: string;
  preview: string;
  img: string;
  readTime: string;
  date: string;
  content: string[];
}

const BLOG_POSTS: BlogArticle[] = [
  {
    title: 'Gestão de pessoas',
    preview: 'Estratégias para reter talentos e construir equipes engajadas em 2026.',
    img: BLOG_STRATEGY_IMAGE,
    readTime: '4 min de leitura',
    date: 'Março 2026',
    content: [
      'Reter profissionais qualificados exige mais do que pacotes salariais competitivos. Empresas que constroem ambientes de confiança e clareza de propósito reduzem drasticamente o turnover nos primeiros 12 meses de contratação.',
      'Na metodologia Fazer Parte da ccbrh, o alinhamento cultural começa antes mesmo da entrevista técnica: mapeamos a rotina real da equipe, o estilo de liderança e as metas da operação para conectar pessoas que desejam permanecer e crescer na empresa.',
      'Acompanhar indicadores de quadro de colaboradores, distribuição salarial e feedbacks estruturados permite agir preventivamente antes que a perda de talentos impacte os resultados do negócio.',
    ],
  },
  {
    title: 'Legislação trabalhista',
    preview: 'Principais mudanças que toda empresa precisa saber para ficar em dia.',
    img: HERO_IMAGE,
    readTime: '5 min de leitura',
    date: 'Fevereiro 2026',
    content: [
      'Manter o Departamento Pessoal em conformidade evita passivos trabalhistas, autuações e custos imprevistos que comprometem a previsibilidade financeira da organização.',
      'A padronização do dossiê admissional — com conferência rigorosa de RG, CPF, comprovante de residência e registros contratuais dentro do prazo — é o primeiro pilar para uma folha de pagamento segura e auditável.',
      'Com o apoio consultivo e operacional da ccbrh, sua empresa estrutura rotinas de admissão, controle de férias e folha com respaldo jurídico e agilidade digital.',
    ],
  },
  {
    title: 'Recrutamento',
    preview: 'Como atrair e selecionar os melhores profissionais para sua empresa.',
    img: CASE_IMAGE,
    readTime: '4 min de leitura',
    date: 'Janeiro 2026',
    content: [
      'Contratar não é apenas preencher uma vaga em aberto: é encontrar quem a empresa gostaria de ter na equipe no longo prazo.',
      'Estruturar o funil de seleção em etapas claras — triagem aderente à cultura, entrevista comportamental, proposta transparente e coleta digital de documentos — reduz o tempo de fechamento de vagas e eleva a qualidade das contratações.',
      'No caso do Empório Varanda, a combinação entre entendimento profundo da operação e metodologia estruturada permitiu preencher 100 posições para duas novas unidades com excelência e rapidez.',
    ],
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenCandidatePortal,
  onOpenCompanyRegistration,
  onOpenTalentRegistration,
  onOpenPublicVacancies,
  isAuthenticated,
  onGoToSaas,
}) => {
  const { database, applyFromLanding } = useHireGrid();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [caseImgError, setCaseImgError] = useState(false);

  // Application / Talent Bank modal state
  const [applyingVacancy, setApplyingVacancy] = useState<Vacancy | null>(null);
  const [talentModalOpen, setTalentModalOpen] = useState(false);
  const [candName, setCandName] = useState('');
  const [candEmail, setCandEmail] = useState('');
  const [candPhone, setCandPhone] = useState('');
  const [candLinkedin, setCandLinkedin] = useState('');
  const [candResumeName, setCandResumeName] = useState('');
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [candError, setCandError] = useState<string | null>(null);

  // Blog article modal state
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactFeedback, setContactFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const openVacancies = database.vacancies
    .filter((v) => {
      if (v.status !== 'open') return false;
      const comp = database.companies.find((c) => c.id === v.tenant_id);
      return !comp || (comp.status !== 'inactive' && comp.status !== 'pending_review');
    })
    .slice(0, 6);

  const navLinks = [
    { label: 'Início', href: '#inicio' },
    { label: 'Quem somos', href: '#quem-somos' },
    { label: 'Soluções', href: '#solucoes' },
    { label: 'Projeto Fazer Parte', href: '#fazer-parte' },
    { label: 'Contato', href: '#contato' },
  ];

  const handleOpenVacancyApply = (vac: Vacancy) => {
    setApplyingVacancy(vac);
    setSelectedVacancyId(vac.id);
    setCandLinkedin('');
    setCandResumeName('');
    setCreatedToken(null);
    setCandError(null);
    setTalentModalOpen(true);
  };

  const handleOpenTalentBank = () => {
    setApplyingVacancy(null);
    setSelectedVacancyId(openVacancies[0]?.id || database.vacancies[0]?.id || '');
    setCandLinkedin('');
    setCandResumeName('');
    setCreatedToken(null);
    setCandError(null);
    setTalentModalOpen(true);
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCandResumeName(file.name);
    setCandError(null);
  };

  const handleSubmitCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    setCandError(null);

    if (!candName.trim() || !candEmail.trim() || !candPhone.trim()) {
      setCandError('Preencha nome completo, e-mail e telefone para concluir o cadastro.');
      return;
    }

    if (!candResumeName.trim()) {
      setCandError('Anexe seu currículo (PDF, DOC ou DOCX) para concluir a candidatura.');
      return;
    }

    const targetVac =
      database.vacancies.find((v) => v.id === selectedVacancyId) ||
      openVacancies[0] ||
      database.vacancies[0];

    if (!targetVac) {
      setCandError('Nenhuma vaga disponível para vínculo no momento.');
      return;
    }

    const normalizedLinkedin = candLinkedin.trim()
      ? candLinkedin.trim().startsWith('http')
        ? candLinkedin.trim()
        : `https://${candLinkedin.trim()}`
      : '';

    const newCandidate = applyFromLanding(
      targetVac.id,
      targetVac.tenant_id,
      candName.trim(),
      candEmail.trim(),
      candPhone.trim(),
      candResumeName.trim(),
      normalizedLinkedin || undefined
    );

    setCreatedToken(newCandidate.document_token);
    setCandName('');
    setCandEmail('');
    setCandPhone('');
    setCandLinkedin('');
    setCandResumeName('');
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactFeedback(null);

    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactFeedback({
        type: 'error',
        text: 'Informe seu nome, e-mail corporativo e como podemos ajudar sua empresa.',
      });
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());
    if (!emailValid) {
      setContactFeedback({
        type: 'error',
        text: 'Informe um endereço de e-mail válido.',
      });
      return;
    }

    setContactLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          company: contactCompany,
          email: contactEmail,
          phone: contactPhone,
          message: contactMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setContactFeedback({
          type: 'error',
          text: data.error || 'Não foi possível enviar a mensagem.',
        });
      } else {
        setContactFeedback({
          type: 'success',
          text: data.summary || 'Mensagem recebida! Nossa equipe responderá em breve.',
        });
        setContactName('');
        setContactCompany('');
        setContactEmail('');
        setContactPhone('');
        setContactMessage('');
      }
    } catch {
      setContactFeedback({
        type: 'error',
        text: 'Erro ao conectar com o servidor. Tente novamente.',
      });
    } finally {
      setContactLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#082175] selection:text-white">
      {/* Top Institutional Header matching ccbrh.com.br */}
      <header className="sticky top-0 z-50 bg-[#082175] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            {/* Zone 1: Brand Wordmark / Logo */}
            <a
              href="#inicio"
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus:outline-none"
            >
              {!logoError ? (
                <img
                  src={CCB_LOGO_URL}
                  alt="CCB Soluções em RH"
                  className="h-11 w-auto rounded bg-white px-2 py-1 object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="px-3 py-1 rounded bg-white text-[#082175] font-extrabold text-base tracking-tight lowercase">
                  ccbrh
                </span>
              )}
            </a>

            {/* Zone 2: 5 Clean Single-Line Nav Links */}
            <nav className="hidden lg:flex items-center gap-5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-200 hover:text-[#f5a90e] transition-colors whitespace-nowrap shrink-0"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Zone 3: Vagas + Primary SaaS Action */}
            <div className="hidden lg:flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenPublicVacancies}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[#c7d2fe] text-[#082175] hover:bg-[#a5b4fc] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Briefcase className="w-4 h-4" />
                <span>Vagas</span>
              </button>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onGoToSaas}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-[#f5a90e] text-white hover:bg-[#d4940c] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Ir para o Painel SaaS</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-[#f5a90e] text-white hover:bg-[#d4940c] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Acessar Plataforma</span>
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 text-white hover:text-[#f5a90e] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 px-4 py-4 space-y-2 bg-[#082175]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-slate-200 hover:text-[#f5a90e]"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPublicVacancies();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#c7d2fe] text-[#082175] hover:bg-[#a5b4fc] transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              <span>Vagas Abertas</span>
            </button>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isAuthenticated) {
                    onGoToSaas();
                  } else {
                    onOpenLogin();
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#f5a90e] text-white hover:bg-[#d4940c] transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>{isAuthenticated ? 'Ir para o Painel SaaS' : 'Acessar Plataforma'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* 1. HERO SECTION */}
        <section id="inicio" className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#03416A] leading-tight tracking-tight text-balance">
                  Desenvolvimento: Empresarial, Profissional e Social com Propósito
                </h1>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
                  Há mais de dez anos apoiando empresas na gestão de pessoas.
                </p>

                <div className="mt-8 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onOpenCompanyRegistration}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#E0F4F7] text-[#03416A] text-xs sm:text-sm font-semibold hover:bg-[#c8e8ed] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Quero contratar a CCB</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenTalentRegistration}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#f5a90e] text-white text-xs sm:text-sm font-semibold hover:bg-[#d4940c] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Quero fazer parte do Banco de Talentos</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => onOpenCandidatePortal()}
                    className="font-semibold text-[#082175] hover:text-[#9F8548] underline underline-offset-4 cursor-pointer"
                  >
                    Já sou candidato e possuo link de documentos
                  </button>
                  <span aria-hidden="true">·</span>
                  <span>São Paulo – SP</span>
                  <span aria-hidden="true">·</span>
                  <span>Atendimento B2B Nacional</span>
                </div>
              </div>

              <div className="relative flex items-center justify-center py-6">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-72 sm:w-88 sm:h-88 lg:w-96 lg:h-96 rounded-full bg-[#082175]" />
                </div>

                {!heroImgError ? (
                  <img
                    src={HERO_IMAGE}
                    alt="Equipe corporativa CCB Soluções em RH"
                    className="relative z-10 rounded-2xl w-full max-w-md mx-auto shadow-2xl object-cover aspect-4/3"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                  />
                ) : (
                  <div className="relative z-10 rounded-2xl w-full max-w-md mx-auto aspect-4/3 bg-[#03416A] flex flex-col items-center justify-center text-white p-8 shadow-2xl">
                    <Users className="w-12 h-12 text-[#f5a90e] mb-3" />
                    <p className="text-center font-semibold">CCB Soluções em Recursos Humanos</p>
                  </div>
                )}

                <div className="absolute bottom-2 right-0 sm:right-4 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 px-5 py-4 max-w-[230px]">
                  <p className="text-sm font-semibold text-[#03416A] leading-snug">
                    Conectando pessoas, empresas e oportunidades.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BARRA DE RECURSOS */}
        <section className="bg-[#E0F4F7] py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { text: 'Recursos Humanos', icon: Users },
                { text: 'Departamento Pessoal', icon: ClipboardCheck },
                { text: 'Folha de Pagamento', icon: FileText },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#082175] flex items-center justify-center">
                      <Icon className="w-6 h-6 text-[#f5a90e]" />
                    </div>
                    <p className="text-sm font-semibold text-[#03416A] leading-snug">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3. VAGAS ABERTAS (INTEGRADAS AO BANCO DO SAAS) */}
        <section id="vagas" className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="text-[#9f8548] text-sm font-semibold uppercase tracking-wide mb-2">
                  Vagas Abertas
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold text-[#082175] tracking-tight">
                  Oportunidades para você
                </h2>
                <p className="text-slate-600 mt-2 max-w-xl">
                  Confira as posições disponíveis nas empresas parceiras da ccbrh e participe do
                  processo seletivo.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPublicVacancies}
                className="text-[#082175] font-semibold inline-flex items-center gap-1.5 hover:text-[#9F8548] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Ver todas as vagas</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {openVacancies.map((vac) => {
                const company = database.companies.find((c) => c.id === vac.tenant_id);
                const job = database.jobs.find((j) => j.id === vac.job_id);
                const branch = (database.branches || []).find((b) => b.id === vac.branch_id);
                const cityLabel = vac.city || branch?.cidade || company?.cidade;
                const stateLabel = vac.state || branch?.estado || company?.estado;
                const locationText = [cityLabel, stateLabel].filter(Boolean).join('/');
                const positionsCount = vac.vacancies_count || 1;
                const showSalary = vac.show_salary !== false && Boolean(job?.base_salary);

                return (
                  <div
                    key={vac.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-[#082175]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-semibold text-[#9F8548]">
                          {job?.department || 'Corporativo'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{company?.name || 'Empresa Parceira'}</span>
                      </div>

                      <h3 className="text-lg font-bold text-[#03416A] mb-1.5">{vac.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                        {locationText && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#9F8548]" />
                            <span>{locationText}</span>
                          </span>
                        )}
                        {branch && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {branch.label}
                          </span>
                        )}
                        {positionsCount > 1 && (
                          <span className="px-2 py-0.5 rounded bg-[#082175]/5 text-[#082175] font-semibold">
                            {positionsCount} vagas
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">
                        {vac.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                      <span className="text-sm font-mono tabular-nums font-semibold text-[#082175]">
                        {showSalary && job ? formatCurrency(job.base_salary) : 'A combinar'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenVacancyApply(vac)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#082175] hover:text-[#9F8548] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Candidatar-se</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. O DESAFIO DA CONTRATAÇÃO */}
        <section className="py-20 bg-[#082175]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="text-[#f5a90e] text-sm font-semibold tracking-wide uppercase">
              O desafio da contratação
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight max-w-3xl text-balance">
              Qual é a sua maior dificuldade para contratar?
            </h2>
            <div className="mt-10 space-y-3">
              {[
                'Encontrar candidatos?',
                'Avaliar o perfil certo?',
                'Reduzir o turnover?',
                'Encontrar pessoas que realmente façam sentido para a sua equipe?',
              ].map((q, idx, arr) => (
                <p
                  key={idx}
                  className={`text-lg ${
                    idx === arr.length - 1 ? 'font-bold text-[#f5a90e]' : 'text-slate-300'
                  }`}
                >
                  {q}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* 5. PROJETO FAZER PARTE */}
        <section id="fazer-parte" className="py-20 bg-[#E0F4F7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                Projeto Fazer Parte · Metodologia própria
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight text-balance">
                Contratação personalizada para o cliente
              </h2>
              <p className="mt-4 italic text-slate-600">
                "Contratar não é preencher uma vaga. É encontrar quem a empresa gostaria de ter na
                equipe."
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-2">
              {[
                { title: 'Entendemos a vaga', icon: Search },
                { title: 'Triagem e seleção', icon: ClipboardCheck },
                { title: 'Conectamos talentos', icon: Sparkles },
                { title: 'Preparamos candidatos', icon: GraduationCap },
                { title: 'Contratamos para fazer parte', icon: CheckCircle2 },
              ].map((step, idx, arr) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="flex flex-col lg:flex-row items-center text-center lg:text-left gap-4"
                  >
                    <div className="flex flex-col items-center gap-3 lg:flex-1">
                      <div className="w-16 h-16 rounded-full bg-[#082175] flex items-center justify-center">
                        <Icon className="w-8 h-8 text-[#f5a90e]" />
                      </div>
                      <span className="text-sm font-semibold text-[#03416A] leading-snug max-w-[180px] text-center">
                        {step.title}
                      </span>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="hidden lg:block text-[#9F8548] text-2xl font-bold px-2">
                        →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-14 grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/70">
                <p className="text-xs font-semibold text-[#9F8548] uppercase mb-2">Empresa</p>
                <p className="italic text-[#03416A] font-medium">
                  "É essa pessoa que eu quero na minha equipe."
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/70">
                <p className="text-xs font-semibold text-[#9F8548] uppercase mb-2">Candidato</p>
                <p className="italic text-[#03416A] font-medium">
                  "É nessa empresa que eu quero trabalhar."
                </p>
              </div>
            </div>

            <p className="text-center mt-6 text-sm font-semibold text-[#03416A]">
              Conexão certa: Empresa + Pessoa
            </p>
          </div>
        </section>

        {/* 6. NOSSAS SOLUÇÕES */}
        <section id="solucoes" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                Nossas Soluções
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                Gestão de pessoas de ponta a ponta
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                O diferencial da CCB está na personalização. Entendemos a cultura, os valores, a
                rotina, a localização e o perfil de cada empresa para encontrar pessoas realmente
                alinhadas ao negócio.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Recrutamento',
                  desc: 'Identificamos talentos alinhados ao perfil, à cultura e aos objetivos da empresa.',
                  icon: Search,
                },
                {
                  title: 'Seleção',
                  desc: 'Avaliamos competências técnicas e comportamentais para aumentar a assertividade da contratação.',
                  icon: UserCheck,
                },
                {
                  title: 'Treinamento',
                  desc: 'Desenvolvemos treinamentos customizados para as necessidades reais de cada equipe.',
                  icon: GraduationCap,
                },
              ].map((sol, idx) => {
                const Icon = sol.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#E0F4F7] p-8 border border-[#c8e8ed] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#082175] flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-[#f5a90e]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#03416A] mb-3">{sol.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">{sol.desc}</p>
                    <a
                      href="#contato"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#082175] hover:text-[#9F8548] transition-colors"
                    >
                      <span>Saiba mais</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl bg-[#082175] p-8 flex flex-col md:flex-row items-start md:items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-[#f5a90e] flex items-center justify-center shrink-0">
                <Sparkles className="w-7 h-7 text-[#082175]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Fazer Parte</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Intuição + metodologia para encontrar não apenas quem pode ocupar a vaga, mas quem
                  o cliente realmente gostaria de ter na equipe. "Se você gostaria de ter aquela
                  pessoa na sua equipe, contrate."
                </p>
              </div>
              <button
                type="button"
                onClick={isAuthenticated ? onGoToSaas : onOpenLogin}
                className="px-6 py-3 rounded-full bg-white text-[#082175] text-sm font-semibold hover:bg-[#E0F4F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Conhecer o SaaS
              </button>
            </div>
          </div>
        </section>

        {/* 7. CONSTRUIR — COMO AJUDAMOS NOSSOS CLIENTES */}
        <section className="py-20 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                Construir
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                Como ajudamos nossos clientes
              </h2>
              <p className="mt-4 text-slate-600">
                Transformamos desafios em soluções que geram eficiência, segurança e crescimento
                sustentável.
              </p>
            </div>

            <div className="bg-[#E0F4F7] rounded-3xl p-6 sm:p-10 divide-y divide-white/70">
              {[
                {
                  problem: 'Dificuldade para contratar',
                  solution:
                    'Encontramos os talentos certos para as vagas certas, no tempo certo.',
                },
                {
                  problem: 'Alto turnover',
                  solution:
                    'Ajudamos a reduzir a rotatividade com contratações mais assertivas e maior aderência à cultura da empresa.',
                },
                {
                  problem: 'Riscos e contingências',
                  solution:
                    'Atuamos de forma preventiva para minimizar riscos e garantir conformidade legal.',
                },
                {
                  problem: 'Organização do DP',
                  solution: 'Estruturamos rotinas e processos com eficiência e segurança.',
                },
                {
                  problem: 'Desenvolvimento de equipes',
                  solution:
                    'Promovemos ambientes saudáveis, capacitação e crescimento contínuo.',
                },
                {
                  problem: 'Capacitação e Treinamento',
                  solution:
                    'Colaboradores preparados para a função e alinhados à cultura da empresa.',
                },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4"
                >
                  <div className="flex items-center gap-2 sm:w-64 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-[#03416A] shrink-0" />
                    <span className="font-semibold text-[#03416A]">{row.problem}</span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{row.solution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. CASES DE SUCESSO */}
        <section className="py-20 bg-[#E0F4F7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center mb-12">
              <div>
                <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                  Cases
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                  Resultados que falam por nós.
                </h2>
                <div className="mt-6 bg-white rounded-2xl border border-slate-200/70 p-6 relative">
                  <Quote className="w-7 h-7 text-[#f5a90e]/40 absolute top-4 left-4" />
                  <p className="pl-8 italic text-slate-700 leading-relaxed">
                    "Tá difícil contratar? O desafio não é preencher uma vaga. É encontrar quem faça
                    parte."
                  </p>
                </div>
              </div>

              <div>
                {!caseImgError ? (
                  <img
                    src={CASE_IMAGE}
                    alt="Empório Varanda - Case de Recrutamento CCB"
                    className="w-full h-64 lg:h-80 rounded-2xl object-cover shadow-lg"
                    referrerPolicy="no-referrer"
                    onError={() => setCaseImgError(true)}
                  />
                ) : (
                  <div className="w-full h-64 lg:h-80 rounded-2xl bg-[#082175] flex flex-col items-center justify-center text-white p-8">
                    <Building2 className="w-10 h-10 text-[#f5a90e] mb-2" />
                    <p className="font-bold">Empório Varanda | Varejo</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-bold text-[#03416A] mb-2">Empório Varanda | Varejo</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Recrutamos, selecionamos e capacitamos 100 novos colaboradores para as duas novas
                  unidades do Empório Varanda.
                </p>
                <h4 className="font-bold text-[#03416A] text-sm mb-1">Desafio</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Montar as equipes completas de duas novas unidades do Empório Varanda, em Moema, na
                  Zona Sul de São Paulo, e Porto Feliz, no interior do estado.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                {[
                  { number: '2', label: 'Novas Unidades' },
                  { number: '100', label: 'Vagas Preenchidas' },
                  { number: '500', label: 'Entrevistas Realizadas' },
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-[#082175]">
                      {stat.number}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 uppercase mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 9. QUEM SOMOS */}
        <section id="quem-somos" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                Quem Somos
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                Duas sócias. Experiências complementares.
              </h2>
              <p className="mt-4 text-slate-600">
                A solidez da CCB é sustentada pela formação e experiência de suas sócias.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
              {[
                {
                  name: 'Cristina Cezar Bastianello',
                  role: 'Gestão de Negócios e Pessoas',
                  desc: 'Direito (PUC-SP) • Mestre em Direito Tributário (PUC-SP). Especialista em Gestão de Negócios e Pessoas (São Paulo Business School).',
                  img: PARTNER_CRISTINA_IMAGE,
                },
                {
                  name: 'Deusa Maria da Silva',
                  role: 'Recursos Humanos e Departamento Pessoal',
                  desc: 'Graduada em Administração de Empresas. Aproximadamente 40 anos de experiência em Recursos Humanos, em empresas de diversos ramos do mercado.',
                  img: PARTNER_DEUSA_IMAGE,
                },
              ].map((profile, idx) => (
                <div key={idx} className="text-center">
                  <img
                    src={profile.img}
                    alt={profile.name}
                    className="w-40 h-40 rounded-full object-cover mx-auto mb-5 border-4 border-[#E0F4F7]"
                    referrerPolicy="no-referrer"
                  />
                  <h3 className="text-xl font-bold text-[#03416A]">{profile.name}</h3>
                  <p className="text-sm text-[#9F8548] font-semibold mb-3">{profile.role}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{profile.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. A CCB E SUA HISTÓRIA */}
        <section className="py-20 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                A CCB e sua história
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                A origem da CCB
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                A CCB nasceu da união de duas profissionais com ampla experiência em gestão de
                negócios e pessoas, que decidiram empreender para aplicar seus conhecimentos e
                experiência em novas oportunidades profissionais.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Oportunidade',
                  desc: 'Identificamos que empresas buscavam terceirizar atividades essenciais que não faziam parte de seu negócio central, mas que eram fundamentais para seu desenvolvimento e lucratividade.',
                  topColor: 'border-t-[#03416A]',
                },
                {
                  title: 'Evolução',
                  desc: 'A atuação começou com serviços administrativos e financeiros e evoluiu para soluções integradas em Recursos Humanos, Departamento Pessoal, Folha de Pagamento e Benefícios.',
                  topColor: 'border-t-[#082175]',
                },
                {
                  title: 'Resultados para os nossos clientes',
                  desc: 'Ao terceirizar essas atividades, as empresas podem concentrar seus esforços em seus negócios principais, enquanto a CCB cuida dos processos e das pessoas com eficiência, segurança e experiência.',
                  topColor: 'border-t-[#9F8548]',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl bg-[#E0F4F7] p-6 border-t-4 ${item.topColor}`}
                >
                  <h3 className="font-bold text-[#03416A] mb-3 uppercase text-sm tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 11. NOSSOS CLIENTES */}
        <section id="clientes" className="py-20 bg-[#E0F4F7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                Nossos Clientes
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                Empresas que confiam na CCB
              </h2>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10 mb-12">
              {['Empório Varanda', 'São Luzita'].map((clientName) => (
                <div
                  key={clientName}
                  className="px-8 py-4 rounded-xl bg-white border border-slate-200/70"
                >
                  <span className="text-lg font-bold text-[#03416A]">{clientName}</span>
                </div>
              ))}
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/70 p-8 relative">
              <Quote className="w-9 h-9 text-[#f5a90e]/35 absolute top-6 left-6" />
              <p className="text-center text-slate-700 leading-relaxed italic pl-8 pr-4">
                "A CCB transformou nosso processo de contratação. Encontramos talentos que realmente
                se encaixam na nossa cultura. Profissionalismo e dedicação em cada etapa."
              </p>
              <p className="text-center mt-4 text-sm font-semibold text-[#03416A]">
                — Cliente Empório Varanda
              </p>
            </div>
          </div>
        </section>

        {/* 12. CTA BANCO DE TALENTOS */}
        <section id="banco-talentos" className="py-16 bg-[#082175]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Faça parte do nosso Banco de Talentos
            </h2>
            <p className="text-slate-300 mb-8 leading-relaxed">
              Cadastre seu currículo e seja conectado às melhores oportunidades.
            </p>
            <button
              type="button"
              onClick={onOpenTalentRegistration}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#f5a90e] text-white font-semibold hover:bg-[#d4940c] transition-colors cursor-pointer"
            >
              <span>Cadastrar meu currículo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* 13. BLOG / CONTEÚDO */}
        <section id="blog" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#9F8548] text-sm font-semibold tracking-wide uppercase">
                Blog
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#03416A] tracking-tight">
                Conteúdo para a sua empresa
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {BLOG_POSTS.map((post, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedArticle(post)}
                  className="rounded-2xl overflow-hidden border border-slate-200 hover:border-[#082175]/40 transition-colors group text-left flex flex-col cursor-pointer bg-white"
                >
                  <img
                    src={post.img}
                    alt={post.title}
                    className="w-full h-44 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span>{post.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#03416A] mb-2 group-hover:text-[#082175] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-4">
                        {post.preview}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9F8548] group-hover:text-[#082175] transition-colors">
                      <span>Ler artigo</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 14. CONTATO */}
        <section id="contato" className="py-20 bg-[#082175]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-6">
                <span className="text-[#f5a90e] text-sm font-semibold tracking-wide uppercase">
                  Conectar
                </span>
                <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Vamos conversar?
                </h2>
                <p className="mt-4 text-slate-300 leading-relaxed">
                  Estamos prontos para entender os desafios da sua empresa e construir soluções que
                  geram resultados reais.
                </p>

                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-5 border-t-4 border-t-[#03416A]">
                    <div className="flex items-center gap-2 text-[#03416A] font-semibold text-sm mb-1.5">
                      <Phone className="w-4 h-4 text-[#9F8548]" />
                      <span>WhatsApp</span>
                    </div>
                    <p className="text-sm text-slate-600 font-mono tabular-nums">
                      55 11 96719-4087 / 9977-47723
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border-t-4 border-t-[#082175]">
                    <div className="flex items-center gap-2 text-[#03416A] font-semibold text-sm mb-1.5">
                      <Mail className="w-4 h-4 text-[#9F8548]" />
                      <span>E-mail</span>
                    </div>
                    <p className="text-sm text-slate-600">contato@ccbrh.com.br</p>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border-t-4 border-t-[#9F8548] sm:col-span-2">
                    <div className="flex items-center gap-2 text-[#03416A] font-semibold text-sm mb-1.5">
                      <Globe className="w-4 h-4 text-[#9F8548]" />
                      <span>Site Oficial & Endereço</span>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">www.ccbrh.com.br</p>
                    <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                      <MapPin className="w-4 h-4 text-[#9F8548] shrink-0 mt-0.5" />
                      <span>
                        Rua Afonso de Freitas, 377, cj. 101 · Paraíso · São Paulo – SP · 04006-051
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead capture form */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
                <h3 className="text-lg font-bold text-[#03416A] mb-1">
                  Solicitar contato corporativo
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Preencha os dados abaixo para conversar com uma sócia da CCB sobre sua demanda de
                  RH ou contratação da plataforma SaaS.
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#03416A] mb-1">
                        Seu nome *
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Ex: Maria Clara"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#03416A] mb-1">
                        Empresa
                      </label>
                      <input
                        type="text"
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        placeholder="Razão social ou nome fantasia"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#03416A] mb-1">
                        E-mail corporativo *
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="nome@empresa.com.br"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#03416A] mb-1">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="(11) 99999-0000"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#03416A] mb-1">
                      Como podemos ajudar? *
                    </label>
                    <textarea
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Descreva a necessidade de recrutamento, departamento pessoal ou acesso ao SaaS ccbrh..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                    />
                  </div>

                  {contactFeedback && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${
                        contactFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{contactFeedback.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full py-3 rounded-full bg-[#082175] text-white text-sm font-semibold hover:bg-[#0a2a8a] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{contactLoading ? 'Enviando solicitação...' : 'Enviar Mensagem'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* OFFICIAL FOOTER */}
      <footer className="bg-[#082175] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                Vamos conversar sobre as necessidades da sua empresa?
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                CCB · 10 anos conectando pessoas, empresas e resultados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={isAuthenticated ? onGoToSaas : onOpenLogin}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#f5a90e] text-white font-semibold hover:bg-[#d4940c] transition-colors cursor-pointer"
              >
                <span>{isAuthenticated ? 'Acessar Painel SaaS' : 'Fale com a CCB / Entrar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {!logoError ? (
                <img
                  src={CCB_LOGO_URL}
                  alt="ccbrh"
                  className="h-10 w-auto rounded bg-white px-2 py-1 object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-extrabold text-base lowercase text-white">ccbrh</span>
              )}
              <span className="text-xs text-slate-300">ccbrh · Plataforma SaaS de RH</span>
            </div>
            <p className="text-xs text-slate-400">
              © 2026 CCB Soluções em Recursos Humanos. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* MODAL: CANDIDATURA / BANCO DE TALENTOS */}
      {talentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-[#9F8548] uppercase">
                  {applyingVacancy ? 'Candidatura Direta' : 'Banco de Talentos CCB'}
                </p>
                <h3 className="text-lg font-bold text-[#03416A] mt-0.5">
                  {applyingVacancy ? applyingVacancy.title : 'Cadastrar meu currículo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTalentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdToken ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Cadastro realizado com sucesso!</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    Seu currículo foi recebido e seu perfil já está no funil de seleção da empresa.
                    Caso queira enviar os demais documentos admissionais agora, acesse o link
                    exclusivo abaixo:
                  </p>
                  <p className="mt-2 font-mono text-[11px] bg-white px-2.5 py-1.5 rounded border border-emerald-200 break-all">
                    {createdToken}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTalentModalOpen(false);
                      onOpenCandidatePortal(createdToken);
                    }}
                    className="flex-1 py-2.5 px-4 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] transition-colors cursor-pointer"
                  >
                    Enviar Documentos Agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setTalentModalOpen(false)}
                    className="py-2.5 px-4 rounded-full border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitCandidate} className="space-y-3.5">
                {!applyingVacancy && openVacancies.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#03416A] mb-1">
                      Vaga de interesse
                    </label>
                    <select
                      value={selectedVacancyId}
                      onChange={(e) => setSelectedVacancyId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                    >
                      {openVacancies.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

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

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com.br"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#03416A] mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={candPhone}
                    onChange={(e) => setCandPhone(e.target.value)}
                    placeholder="(11) 99999-0000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
                  />
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
                      onChange={handleResumeFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {candError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium">
                    {candError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTalentModalOpen(false)}
                    className="px-4 py-2 rounded-full border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Concluir Cadastro</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: LEITURA DE ARTIGO DO BLOG */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <img
              src={selectedArticle.img}
              alt={selectedArticle.title}
              className="w-full h-52 object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-[#9F8548]">{selectedArticle.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedArticle.readTime}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-2xl font-bold text-[#03416A] mb-4">{selectedArticle.title}</h3>
              <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                {selectedArticle.content.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href="#contato"
                  onClick={() => setSelectedArticle(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#082175] hover:text-[#9F8548]"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Falar com uma especialista CCB</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="px-4 py-2 rounded-full bg-[#E0F4F7] text-[#03416A] text-xs font-semibold hover:bg-[#c8e8ed] cursor-pointer"
                >
                  Fechar artigo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
