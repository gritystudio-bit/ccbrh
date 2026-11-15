import React, { useState, useEffect } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import { Candidate, PipelineStage, DocumentType } from '../types/database';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  UserPlus,
  Filter,
  RefreshCw,
  Eye,
  X,
  FileText,
  UserCheck,
  Link2,
} from 'lucide-react';

interface RecruitmentPipelineModuleProps {
  onOpenPortal: (candidateToken: string) => void;
}

const STAGES: { id: PipelineStage; label: string; headerAccent: string }[] = [
  {
    id: 'triagem',
    label: '1. Triagem Curricular',
    headerAccent: 'border-slate-300 text-slate-800',
  },
  {
    id: 'entrevista',
    label: '2. Entrevistas Técnicas',
    headerAccent: 'border-[#03416A] text-[#03416A]',
  },
  {
    id: 'proposta',
    label: '3. Envio de Proposta',
    headerAccent: 'border-[#9F8548] text-[#9F8548]',
  },
  {
    id: 'aprovado',
    label: '4. Aprovados para Contratação',
    headerAccent: 'border-emerald-600 text-emerald-800',
  },
];

export const RecruitmentPipelineModule: React.FC<RecruitmentPipelineModuleProps> = ({
  onOpenPortal,
}) => {
  const {
    candidates,
    vacancies,
    documents,
    employees,
    currentTenantId,
    updateCandidateStage,
    reissueCandidateToken,
    promoteCandidateToEmployee,
    addNewCandidate,
  } = useHireGrid();

  const [selectedVacancyFilter, setSelectedVacancyFilter] = useState<string>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Onboarding modal
  const [onboardingCandidate, setOnboardingCandidate] = useState<Candidate | null>(null);
  const [selectedReportsTo, setSelectedReportsTo] = useState<string>('');
  const [hireDate, setHireDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [onboardingSuccessMsg, setOnboardingSuccessMsg] = useState<{
    text: string;
    sql: string;
  } | null>(null);

  // New Candidate Modal
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [newCandName, setNewCandName] = useState('');
  const [newCandEmail, setNewCandEmail] = useState('');
  const [newCandPhone, setNewCandPhone] = useState('');
  const [newCandVacancy, setNewCandVacancy] = useState(vacancies[0]?.id || '');

  useEffect(() => {
    setNewCandVacancy(vacancies[0]?.id || '');
    setSelectedVacancyFilter('all');
  }, [currentTenantId, vacancies]);

  const filteredCandidates = candidates.filter((c) => {
    if (selectedVacancyFilter !== 'all' && c.vacancy_id !== selectedVacancyFilter) {
      return false;
    }
    return true;
  });

  const getCandidateDocuments = (candidateId: string) => {
    return documents.filter((d) => d.candidate_id === candidateId);
  };

  const getDocumentStatusSummary = (candidateId: string) => {
    const docs = getCandidateDocuments(candidateId);
    const required: DocumentType[] = ['RG', 'CPF', 'Comprovante_Residencia', 'Curriculo'];
    const uploadedTypes = new Set(docs.map((d) => d.document_type));
    const missing = required.filter((t) => !uploadedTypes.has(t));
    const approvedCount = docs.filter((d) => d.status === 'approved').length;
    const pendingReviewCount = docs.filter((d) => d.status === 'pending_review').length;

    return {
      total: docs.length,
      approvedCount,
      pendingReviewCount,
      missing,
    };
  };

  const handleCopyLink = (token: string, candidateId: string) => {
    const origin = window.location.origin;
    const link = `${origin}/#portal?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedTokenId(candidateId);
    setTimeout(() => setCopiedTokenId(null), 2500);
  };

  const handleExecuteOnboarding = () => {
    if (!onboardingCandidate) return;

    const res = promoteCandidateToEmployee(
      onboardingCandidate.id,
      selectedReportsTo || null,
      hireDate
    );

    if (res.success) {
      setOnboardingSuccessMsg({
        text: res.message,
        sql: res.sql,
      });
      setTimeout(() => {
        setOnboardingCandidate(null);
      }, 4500);
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Etapas do Processo Seletivo
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Recrutamento e Seleção de Candidatos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe visualmente cada etapa da seleção, solicite documentos e admita os aprovados em um clique.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#9F8548]" />
            <span className="font-semibold text-[#03416A]">Vaga:</span>
            <select
              aria-label="Filtrar por Vaga"
              value={selectedVacancyFilter}
              onChange={(e) => setSelectedVacancyFilter(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-[#082175] outline-none"
            >
              <option value="all">Todas as Vagas ({vacancies.length})</option>
              {vacancies.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowNewCandidateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#f5a90e]" />
            <span>Adicionar Candidato</span>
          </button>
        </div>
      </div>

      {/* Visual Kanban Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageCandidates = filteredCandidates.filter((c) => c.pipeline_stage === stage.id);

          return (
            <div
              key={stage.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-slate-100/60 p-3.5 min-h-[500px]"
            >
              {/* Stage Header */}
              <div className={`flex items-center justify-between pb-3 border-b-2 ${stage.headerAccent} mb-3`}>
                <span className="text-xs font-bold">{stage.label}</span>
                <span className="text-xs font-mono tabular-nums font-bold text-slate-600">
                  {stageCandidates.length}
                </span>
              </div>

              {/* Candidates Cards */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-0.5">
                {stageCandidates.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg bg-white/70">
                    Nenhum candidato nesta fase.
                  </div>
                ) : (
                  stageCandidates.map((candidate) => {
                    const vac = vacancies.find((v) => v.id === candidate.vacancy_id);
                    const docSummary = getDocumentStatusSummary(candidate.id);
                    const now = new Date();
                    const isTokenExpired = new Date(candidate.token_expires_at) < now;

                    return (
                      <div
                        key={candidate.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-[#03416A]/50 transition-all space-y-2.5 shadow-xs"
                      >
                        {/* Name and Link Status */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-[#082175] leading-tight">
                              {candidate.full_name}
                            </h4>
                            {isTokenExpired ? (
                              <span
                                title="Link vencido! Reemita para liberar o envio."
                                className="text-[10px] font-bold text-amber-800 flex items-center gap-1 shrink-0"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Expirado</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Ativo</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#03416A] truncate mt-1">
                            {vac?.title || 'Vaga Geral'}
                          </p>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {candidate.email} · {candidate.phone}
                          </div>
                          {candidate.linkedin_url && (
                            <a
                              href={candidate.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#082175] hover:text-[#9F8548] hover:underline mt-1 truncate max-w-full"
                            >
                              <Link2 className="w-3 h-3 shrink-0" />
                              <span className="truncate">Perfil LinkedIn</span>
                            </a>
                          )}
                        </div>

                        {/* Document Status */}
                        <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="flex items-center gap-1 font-medium">
                              <FileText className="w-3 h-3 text-slate-400" />
                              <span className="font-mono tabular-nums">
                                Docs: {docSummary.total}/4
                              </span>
                            </span>
                            {docSummary.approvedCount === 4 ? (
                              <span className="text-emerald-700 font-bold text-[10px]">
                                100% Validados
                              </span>
                            ) : docSummary.pendingReviewCount > 0 ? (
                              <span className="text-[#03416A] font-bold text-[10px]">
                                {docSummary.pendingReviewCount} em análise
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                {docSummary.missing.length} pendente(s)
                              </span>
                            )}
                          </div>

                          {/* 4 Document Status Grid */}
                          <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center">
                            {(['RG', 'CPF', 'Comprovante_Residencia', 'Curriculo'] as DocumentType[]).map((type) => {
                              const doc = documents.find(
                                (d) => d.candidate_id === candidate.id && d.document_type === type
                              );
                              const isApproved = doc?.status === 'approved';
                              const isPending = doc?.status === 'pending_review';
                              const isRejected = doc?.status === 'rejected';

                              let badgeClass = 'bg-slate-50 text-slate-400 border-slate-200';
                              const label = type === 'Comprovante_Residencia' ? 'Resid.' : type;

                              if (isApproved) badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
                              else if (isPending) badgeClass = 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed] font-semibold';
                              else if (isRejected) badgeClass = 'bg-red-50 text-red-800 border-red-200 font-bold';

                              return (
                                <div
                                  key={type}
                                  title={`${type}: ${doc ? doc.status : 'Não enviado'}`}
                                  className={`py-0.5 rounded border ${badgeClass} truncate`}
                                >
                                  {label}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions: Portal Link & Re-issue */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                          <button
                            onClick={() => onOpenPortal(candidate.document_token)}
                            className="text-[#082175] hover:text-[#9F8548] hover:underline font-semibold flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Abrir Portal</span>
                          </button>

                          {isTokenExpired ? (
                            <button
                              onClick={() => {
                                reissueCandidateToken(candidate.id);
                                alert(`Link renovado com sucesso para ${candidate.full_name}! (+7 dias de validade).`);
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#9F8548]/15 hover:bg-[#9F8548]/25 text-[#9F8548] font-bold text-[10px] transition-colors"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Renovar Link</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCopyLink(candidate.document_token, candidate.id)}
                              className="text-slate-500 hover:text-[#082175] text-[10px] flex items-center gap-1 font-medium"
                            >
                              {copiedTokenId === candidate.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">Link Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar Link</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Move Stage Selector */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">Etapa:</span>
                          <select
                            aria-label={`Mover estágio de ${candidate.full_name}`}
                            value={candidate.pipeline_stage}
                            onChange={(e) =>
                              updateCandidateStage(candidate.id, e.target.value as PipelineStage)
                            }
                            className="bg-slate-50 text-[#03416A] border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-semibold outline-none"
                          >
                            <option value="triagem">Triagem</option>
                            <option value="entrevista">Entrevista</option>
                            <option value="proposta">Proposta</option>
                            <option value="aprovado">Aprovado</option>
                          </select>
                        </div>

                        {/* Admission Action */}
                        {candidate.pipeline_stage === 'aprovado' && (
                          <button
                            onClick={() => {
                              setOnboardingCandidate(candidate);
                              setSelectedReportsTo(employees[0]?.id || '');
                              setOnboardingSuccessMsg(null);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold text-xs shadow-xs transition-colors mt-2"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-[#f5a90e]" />
                            <span>Admitir Colaborador</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Onboarding Modal */}
      {onboardingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="text-[11px] font-semibold text-[#9F8548]">
                  Admissão de Novo Colaborador
                </p>
                <h3 className="text-lg font-bold text-[#082175] mt-0.5">
                  Efetivar Contratação: {onboardingCandidate.full_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfere o candidato para o quadro de funcionários ativos e migra os documentos do repositório.
                </p>
              </div>
              <button
                onClick={() => setOnboardingCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {onboardingSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>{onboardingSuccessMsg.text}</span>
                </div>
                <button
                  onClick={() => setOnboardingCandidate(null)}
                  className="w-full py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold rounded-lg text-xs"
                >
                  Concluir e Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">
                    Data de Admissão:
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">
                    Gestor Imediato (Organograma):
                  </label>
                  <select
                    value={selectedReportsTo}
                    onChange={(e) => setSelectedReportsTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                  >
                    <option value="">Diretoria Geral (Sem gestor intermediário)</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-[#03416A] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#9F8548]" />
                    <span>Documentos que serão transferidos para o funcionário:</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {documents
                      .filter((d) => d.candidate_id === onboardingCandidate.id)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between"
                        >
                          <span className="text-slate-800 font-medium">{doc.document_type}</span>
                          <span className="text-emerald-700 font-bold text-[10px]">
                            {doc.status === 'approved' ? 'Aprovado' : doc.status}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setOnboardingCandidate(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleExecuteOnboarding}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold shadow-xs transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-[#f5a90e]" />
                    <span>Confirmar Admissão</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Candidate Modal */}
      {showNewCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">
                Cadastrar Novo Candidato
              </h3>
              <button
                onClick={() => setShowNewCandidateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCandName || !newCandEmail || !newCandVacancy) return;
                addNewCandidate(newCandVacancy, newCandName, newCandEmail, newCandPhone);
                setShowNewCandidateModal(false);
                setNewCandName('');
                setNewCandEmail('');
                setNewCandPhone('');
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Nome Completo:</label>
                <input
                  type="text"
                  required
                  value={newCandName}
                  onChange={(e) => setNewCandName(e.target.value)}
                  placeholder="Ex: Beatriz Miranda"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                />
              </div>

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">E-mail Profissional:</label>
                <input
                  type="email"
                  required
                  value={newCandEmail}
                  onChange={(e) => setNewCandEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                />
              </div>

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Telefone / WhatsApp:</label>
                <input
                  type="text"
                  value={newCandPhone}
                  onChange={(e) => setNewCandPhone(e.target.value)}
                  placeholder="+55 11 98888-7777"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                />
              </div>

              <div>
                <label className="block text-[#03416A] font-semibold mb-1">Vaga Pretendida:</label>
                <select
                  required
                  value={newCandVacancy}
                  onChange={(e) => setNewCandVacancy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                >
                  {vacancies.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCandidateModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white rounded-lg font-semibold shadow-xs"
                >
                  Salvar Candidato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
