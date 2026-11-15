import React, { useState, useEffect } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  Candidate,
  PipelineStage,
  DocumentType,
  TalentBankEntry,
} from '../types/database';
import { CandidateLocationMap } from './CandidateLocationMap';
import { CandidateDocumentsModal } from './recruitment/CandidateDocumentsModal';
import {
  calculateDistanceKm,
  estimatePublicTransitMorningPeak,
  formatCandidateAddress,
  lookupCep,
} from '../utils/geocoding';
import { triggerBrowserDownload } from '../utils/documentViewer';
import {
  AlertTriangle,
  Bus,
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
  MapPin,
  Kanban,
  Trash2,
  Pencil,
  Users,
  Loader2,
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
    branches,
    documents,
    employees,
    talentBank,
    currentTenantId,
    updateCandidateStage,
    updateCandidate,
    deleteCandidate,
    geocodeCandidate,
    reissueCandidateToken,
    promoteCandidateToEmployee,
    addNewCandidate,
    uploadCandidateDocument,
    updateDocumentStatus,
    deleteDocument,
    getDocumentSignedUrl,
    updateTalentStatus,
    deleteTalentEntry,
  } = useCcb();

  const [viewMode, setViewMode] = useState<'kanban' | 'location' | 'talent_bank'>('kanban');
  const [mapFocusedCandidateId, setMapFocusedCandidateId] = useState<string | null>(null);
  const [docsModalCandidateId, setDocsModalCandidateId] = useState<string | null>(null);
  const [selectedVacancyFilter, setSelectedVacancyFilter] = useState<string>('all');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Onboarding modal
  const [onboardingCandidate, setOnboardingCandidate] = useState<Candidate | null>(null);
  const [selectedReportsTo, setSelectedReportsTo] = useState<string>('');
  const [hireDate, setHireDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingSuccessMsg, setOnboardingSuccessMsg] = useState<{
    text: string;
    sql: string;
  } | null>(null);

  // New / Edit Candidate Modal
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [lookingUpCep, setLookingUpCep] = useState(false);
  const [newCandName, setNewCandName] = useState('');
  const [newCandEmail, setNewCandEmail] = useState('');
  const [newCandPhone, setNewCandPhone] = useState('');
  const [newCandLinkedin, setNewCandLinkedin] = useState('');
  const [newCandVacancy, setNewCandVacancy] = useState(vacancies[0]?.id || '');
  const [newCandCep, setNewCandCep] = useState('');
  const [newCandEndereco, setNewCandEndereco] = useState('');
  const [newCandNumero, setNewCandNumero] = useState('');
  const [newCandComplemento, setNewCandComplemento] = useState('');
  const [newCandBairro, setNewCandBairro] = useState('');
  const [newCandCidade, setNewCandCidade] = useState('');
  const [newCandEstado, setNewCandEstado] = useState('SP');

  useEffect(() => {
    setNewCandVacancy(vacancies[0]?.id || '');
    setSelectedVacancyFilter('all');
  }, [currentTenantId, vacancies]);

  const resetCandidateForm = () => {
    setEditingCandidate(null);
    setNewCandName('');
    setNewCandEmail('');
    setNewCandPhone('');
    setNewCandLinkedin('');
    setNewCandVacancy(vacancies[0]?.id || '');
    setNewCandCep('');
    setNewCandEndereco('');
    setNewCandNumero('');
    setNewCandComplemento('');
    setNewCandBairro('');
    setNewCandCidade('');
    setNewCandEstado('SP');
  };

  const openEditCandidate = (cand: Candidate) => {
    setEditingCandidate(cand);
    setNewCandName(cand.full_name);
    setNewCandEmail(cand.email);
    setNewCandPhone(cand.phone || '');
    setNewCandLinkedin(cand.linkedin_url || '');
    setNewCandVacancy(cand.vacancy_id || vacancies[0]?.id || '');
    setNewCandCep(cand.cep || '');
    setNewCandEndereco(cand.endereco || '');
    setNewCandNumero(cand.numero || '');
    setNewCandComplemento(cand.complemento || '');
    setNewCandBairro(cand.bairro || '');
    setNewCandCidade(cand.cidade || '');
    setNewCandEstado(cand.estado || 'SP');
    setShowNewCandidateModal(true);
  };

  const handleCepLookup = async (rawCep: string) => {
    setNewCandCep(rawCep);
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length === 8) {
      setLookingUpCep(true);
      const addr = await lookupCep(digits);
      if (addr) {
        setNewCandEndereco(addr.logradouro || '');
        setNewCandBairro(addr.bairro || '');
        setNewCandCidade(addr.localidade || '');
        setNewCandEstado(addr.uf || 'SP');
      }
      setLookingUpCep(false);
    }
  };

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

  const handleExecuteOnboarding = async () => {
    if (!onboardingCandidate) return;
    setOnboardingBusy(true);
    try {
      const res = await promoteCandidateToEmployee(
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
        setFeedbackBanner({ type: 'error', text: res.message });
      }
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao efetivar contratação.',
      });
    } finally {
      setOnboardingBusy(false);
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim() || !newCandEmail.trim()) return;
    setSavingCandidate(true);
    setFeedbackBanner(null);

    try {
      if (editingCandidate) {
        await updateCandidate(editingCandidate.id, {
          full_name: newCandName.trim(),
          email: newCandEmail.trim(),
          phone: newCandPhone.trim(),
          linkedin_url: newCandLinkedin.trim() || null,
          vacancy_id: newCandVacancy || editingCandidate.vacancy_id,
          cep: newCandCep.trim() || null,
          endereco: newCandEndereco.trim() || null,
          numero: newCandNumero.trim() || null,
          complemento: newCandComplemento.trim() || null,
          bairro: newCandBairro.trim() || null,
          cidade: newCandCidade.trim() || null,
          estado: newCandEstado.trim() || null,
        });
        setFeedbackBanner({
          type: 'success',
          text: `Dados de ${newCandName.trim()} atualizados com sucesso.`,
        });
      } else {
        await addNewCandidate({
          vacancyId: newCandVacancy,
          fullName: newCandName.trim(),
          email: newCandEmail.trim(),
          phone: newCandPhone.trim(),
          linkedinUrl: newCandLinkedin.trim() || undefined,
          cep: newCandCep.trim() || undefined,
          endereco: newCandEndereco.trim() || undefined,
          numero: newCandNumero.trim() || undefined,
          complemento: newCandComplemento.trim() || undefined,
          bairro: newCandBairro.trim() || undefined,
          cidade: newCandCidade.trim() || undefined,
          estado: newCandEstado.trim() || undefined,
        });
        setFeedbackBanner({
          type: 'success',
          text: `Candidato ${newCandName.trim()} cadastrado e geocodificado com sucesso.`,
        });
      }
      setShowNewCandidateModal(false);
      resetCandidateForm();
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar candidato.',
      });
    } finally {
      setSavingCandidate(false);
    }
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!window.confirm(`Deseja excluir o candidato "${candidate.full_name}" permanentemente?`)) {
      return;
    }
    setActionBusyId(candidate.id);
    try {
      await deleteCandidate(candidate.id);
      setFeedbackBanner({
        type: 'success',
        text: `Candidato ${candidate.full_name} removido.`,
      });
    } catch (err) {
      setFeedbackBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao excluir candidato.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {feedbackBanner && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
            Acompanhe visualmente cada etapa, visualize candidatos no mapa por proximidade e gerencie o banco de talentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#082175] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban ({filteredCandidates.length})</span>
            </button>
            <button
              onClick={() => setViewMode('location')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'location'
                  ? 'bg-[#082175] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Localização</span>
            </button>
            <button
              onClick={() => setViewMode('talent_bank')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                viewMode === 'talent_bank'
                  ? 'bg-[#082175] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Banco de Talentos ({talentBank.length})</span>
            </button>
          </div>

          {viewMode !== 'talent_bank' && (
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
          )}

          <button
            onClick={() => {
              resetCandidateForm();
              setShowNewCandidateModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#f5a90e]" />
            <span>Adicionar Candidato</span>
          </button>
        </div>
      </div>

      {viewMode === 'location' ? (
        <CandidateLocationMap
          candidates={filteredCandidates}
          branches={branches}
          vacancies={vacancies}
          initialSelectedCandidateId={mapFocusedCandidateId}
          onGeocodeCandidate={geocodeCandidate}
        />
      ) : viewMode === 'talent_bank' ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#082175]">
                Banco de Talentos Geral
              </h2>
              <p className="text-xs text-slate-500">
                Profissionais cadastrados espontaneamente pela página pública.
              </p>
            </div>
          </div>
          {talentBank.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Nenhum talento cadastrado no banco até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {talentBank.map((talent) => (
                <div
                  key={talent.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="space-y-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#082175]">
                        {talent.nome}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[#03416A] text-[10px] font-semibold">
                        {talent.cargo_desejado || 'Geral'} · {talent.area_interesse || talent.regime_preferido}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {talent.email} · {talent.telefone || 'Sem telefone'} · {talent.cidade || '-'}/{talent.estado || '-'} ({talent.disponibilidade})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Status de ${talent.nome}`}
                      value={talent.status}
                      onChange={async (e) => {
                        try {
                          await updateTalentStatus(
                            talent.id,
                            e.target.value as TalentBankEntry['status']
                          );
                        } catch (err) {
                          setFeedbackBanner({
                            type: 'error',
                            text: err instanceof Error ? err.message : 'Erro ao atualizar status.',
                          });
                        }
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#03416A]"
                    >
                      <option value="disponivel">Disponível</option>
                      <option value="em_processo">Em Processo</option>
                      <option value="contratado">Contratado</option>
                      <option value="inativo">Inativo</option>
                    </select>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Excluir ${talent.nome} do Banco de Talentos?`)) return;
                        try {
                          await deleteTalentEntry(talent.id);
                        } catch (err) {
                          setFeedbackBanner({
                            type: 'error',
                            text: err instanceof Error ? err.message : 'Erro ao excluir talento.',
                          });
                        }
                      }}
                      className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      title="Excluir talento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      /* Visual Kanban Flow */
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
                          {formatCandidateAddress(candidate) !== '' && (
                            <div className="text-[11px] text-slate-600 mt-1 space-y-1">
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-[#9F8548] shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{formatCandidateAddress(candidate)}</span>
                              </div>
                              {(() => {
                                const appliedBranch =
                                  (vac?.branch_id
                                    ? branches.find((b) => b.id === vac.branch_id)
                                    : undefined) ||
                                  branches.find((b) => b.is_headquarters) ||
                                  branches[0];
                                const distKm =
                                  candidate.latitude != null &&
                                  candidate.longitude != null &&
                                  appliedBranch?.latitude != null &&
                                  appliedBranch?.longitude != null
                                    ? calculateDistanceKm(
                                        candidate.latitude,
                                        candidate.longitude,
                                        appliedBranch.latitude,
                                        appliedBranch.longitude
                                      )
                                    : null;
                                const transit =
                                  distKm !== null
                                    ? estimatePublicTransitMorningPeak(
                                        distKm,
                                        candidate.cidade,
                                        appliedBranch?.cidade
                                      )
                                    : null;
                                if (!transit || distKm === null) return null;
                                return (
                                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] text-[#082175] font-semibold">
                                    <Bus className="w-3 h-3 text-[#03416A] shrink-0" />
                                    <span className="truncate">
                                      Pico 06h: <strong>~{transit.durationLabel}</strong> (Chegada ~
                                      {transit.arrivalTime}) · {distKm} km
                                    </span>
                                  </div>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={() => {
                                  setMapFocusedCandidateId(candidate.id);
                                  setViewMode('location');
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#082175] hover:text-[#9F8548] underline cursor-pointer"
                              >
                                <MapPin className="w-2.5 h-2.5" />
                                <span>Localizar no Mapa (Proximidade da Filial)</span>
                              </button>
                            </div>
                          )}
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
                            <button
                              type="button"
                              onClick={() => setDocsModalCandidateId(candidate.id)}
                              className="flex items-center gap-1 font-bold text-[#082175] hover:text-[#9F8548] cursor-pointer"
                            >
                              <FileText className="w-3 h-3 text-[#9F8548]" />
                              <span className="font-mono tabular-nums underline">
                                Docs: {docSummary.total}/4 (Gerenciar)
                              </span>
                            </button>
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
                          <div
                            onClick={() => setDocsModalCandidateId(candidate.id)}
                            className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center cursor-pointer"
                          >
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
                              disabled={actionBusyId === candidate.id}
                              onClick={async () => {
                                setActionBusyId(candidate.id);
                                try {
                                  await reissueCandidateToken(candidate.id);
                                  setFeedbackBanner({
                                    type: 'success',
                                    text: `Link renovado com sucesso para ${candidate.full_name} (+7 dias).`,
                                  });
                                } catch (err) {
                                  setFeedbackBanner({
                                    type: 'error',
                                    text: err instanceof Error ? err.message : 'Erro ao renovar token.',
                                  });
                                } finally {
                                  setActionBusyId(null);
                                }
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

                        {/* Move Stage Selector + Edit / Delete */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] gap-1">
                          <div className="flex items-center gap-1">
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditCandidate(candidate)}
                              title="Editar candidato"
                              className="p-1 text-slate-400 hover:text-[#082175] rounded hover:bg-slate-100"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              disabled={actionBusyId === candidate.id}
                              onClick={() => handleDeleteCandidate(candidate)}
                              title="Excluir candidato"
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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
      )}

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
                    disabled={onboardingBusy}
                    onClick={handleExecuteOnboarding}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold shadow-xs transition-colors disabled:opacity-60"
                  >
                    {onboardingBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#f5a90e]" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-[#f5a90e]" />
                    )}
                    <span>{onboardingBusy ? 'Efetivando...' : 'Confirmar Admissão'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New / Edit Candidate Modal */}
      {showNewCandidateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#082175]">
                {editingCandidate ? 'Editar Candidato' : 'Cadastrar Novo Candidato'}
              </h3>
              <button
                onClick={() => {
                  setShowNewCandidateModal(false);
                  resetCandidateForm();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
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
                  <label className="block text-[#03416A] font-semibold mb-1">E-mail:</label>
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
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                  />
                </div>

                <div>
                  <label className="block text-[#03416A] font-semibold mb-1">LinkedIn (opcional):</label>
                  <input
                    type="url"
                    value={newCandLinkedin}
                    onChange={(e) => setNewCandLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
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
              </div>

              {/* Address block for Location view */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#082175] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#9F8548]" />
                    <span>Endereço (para Visão de Localização)</span>
                  </span>
                  {lookingUpCep && (
                    <span className="text-[11px] text-[#03416A] flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Buscando CEP...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">CEP:</label>
                    <input
                      type="text"
                      value={newCandCep}
                      onChange={(e) => handleCepLookup(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[#03416A] font-semibold mb-1">Logradouro / Rua:</label>
                    <input
                      type="text"
                      value={newCandEndereco}
                      onChange={(e) => setNewCandEndereco(e.target.value)}
                      placeholder="Av. / Rua..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">Número:</label>
                    <input
                      type="text"
                      value={newCandNumero}
                      onChange={(e) => setNewCandNumero(e.target.value)}
                      placeholder="123"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">Bairro:</label>
                    <input
                      type="text"
                      value={newCandBairro}
                      onChange={(e) => setNewCandBairro(e.target.value)}
                      placeholder="Centro"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">Complemento:</label>
                    <input
                      type="text"
                      value={newCandComplemento}
                      onChange={(e) => setNewCandComplemento(e.target.value)}
                      placeholder="Apto 12"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[#03416A] font-semibold mb-1">Cidade:</label>
                    <input
                      type="text"
                      value={newCandCidade}
                      onChange={(e) => setNewCandCidade(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#03416A] font-semibold mb-1">UF:</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newCandEstado}
                      onChange={(e) => setNewCandEstado(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCandidateModal(false);
                    resetCandidateForm();
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCandidate}
                  className="px-4 py-2 bg-[#082175] hover:bg-[#0a2a8a] text-white rounded-lg font-semibold shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingCandidate && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {savingCandidate
                      ? 'Salvando...'
                      : editingCandidate
                      ? 'Salvar Alterações'
                      : 'Salvar Candidato'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CandidateDocumentsModal
        candidate={candidates.find((c) => c.id === docsModalCandidateId) || null}
        documents={documents}
        onClose={() => setDocsModalCandidateId(null)}
        onUploadDocument={(candId, docType, file) =>
          uploadCandidateDocument(candId, docType, file)
        }
        onUpdateStatus={(docId, status) => updateDocumentStatus(docId, status)}
        onDeleteDocument={(docId, storagePath) => deleteDocument(docId, storagePath)}
        onOpenDocument={async (storagePath, _docLabel, isDownload) => {
          const rawFileName = storagePath.split('/').pop() || 'documento_candidato.pdf';
          const cleanFileName = rawFileName.replace(/^\d{10,}_/, '');
          const url = await getDocumentSignedUrl(
            storagePath,
            isDownload ? { download: cleanFileName } : undefined
          );
          if (url) {
            if (isDownload) {
              triggerBrowserDownload(url, cleanFileName);
            }
            return { url, fileName: cleanFileName };
          }
          return null;
        }}
      />
    </div>
  );
};
