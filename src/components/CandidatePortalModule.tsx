import React, { useState } from 'react';
import { useHireGrid } from '../context/HireGridContext';
import { DocumentType } from '../types/database';
import {
  FileCheck,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  RefreshCw,
  XCircle,
  Check,
} from 'lucide-react';

interface CandidatePortalModuleProps {
  initialToken?: string | null;
}

const REQUIRED_DOCS: { type: DocumentType; label: string; desc: string }[] = [
  {
    type: 'RG',
    label: 'Documento de Identidade (RG)',
    desc: 'Digitalização frente e verso legível com foto recente e número do órgão emissor.',
  },
  {
    type: 'CPF',
    label: 'Comprovante do CPF',
    desc: 'Comprovante de Inscrição e Situação Cadastral emitido pela Receita Federal.',
  },
  {
    type: 'Comprovante_Residencia',
    label: 'Comprovante de Residência',
    desc: 'Fatura recente (energia, saneamento, gás ou internet) emitida há no máximo 90 dias.',
  },
  {
    type: 'Curriculo',
    label: 'Currículo Profissional Atualizado',
    desc: 'Arquivo em PDF com histórico de experiências profissionais e qualificações.',
  },
];

export const CandidatePortalModule: React.FC<CandidatePortalModuleProps> = ({
  initialToken,
}) => {
  const {
    candidates,
    documents,
    currentCompany,
    uploadCandidateDocument,
    updateDocumentStatus,
    reissueCandidateToken,
  } = useHireGrid();

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(() => {
    if (initialToken) {
      const match = candidates.find((c) => c.document_token === initialToken);
      if (match) return match.id;
    }
    const candInProposal = candidates.find(
      (c) => c.pipeline_stage === 'proposta' || c.pipeline_stage === 'aprovado'
    );
    return candInProposal?.id || candidates[0]?.id || '';
  });

  const [activeRoleView, setActiveRoleView] = useState<'candidate' | 'recruiter'>('candidate');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const candidate = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  if (!candidate) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400">
        Nenhum candidato encontrado na empresa selecionada.
      </div>
    );
  }

  const now = new Date();
  const tokenExpiresAt = new Date(candidate.token_expires_at);
  const isExpired = tokenExpiresAt < now;
  const candidateDocs = documents.filter((d) => d.candidate_id === candidate.id);

  const handleSimulateUpload = (type: DocumentType) => {
    if (isExpired) {
      setUploadFeedback('Atenção: O link de autoenvio expirou. O envio foi bloqueado até a renovação do link.');
      setTimeout(() => setUploadFeedback(null), 4000);
      return;
    }

    const mockFileName = `${type.toLowerCase()}_${candidate.full_name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    uploadCandidateDocument(candidate.id, type, mockFileName);
    setUploadFeedback(`Documento "${type}" enviado com sucesso para a pasta segura da empresa!`);
    setTimeout(() => setUploadFeedback(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Portal Seguro de Autoenvio
          </p>
          <h2 className="text-lg font-bold text-[#082175] mt-0.5">
            Envio de Documentos para Admissão
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Candidato:</span>
            <select
              aria-label="Selecionar Candidato"
              value={candidate.id}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="bg-slate-50 text-[#03416A] border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-[#082175]"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.pipeline_stage}) {new Date(c.token_expires_at) < now ? '[Link Vencido]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveRoleView('candidate')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeRoleView === 'candidate'
                  ? 'bg-white text-[#082175] shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              Visão do Candidato
            </button>
            <button
              onClick={() => setActiveRoleView('recruiter')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeRoleView === 'recruiter'
                  ? 'bg-white text-[#082175] shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              Revisão do RH
            </button>
          </div>
        </div>
      </div>

      {uploadFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Token Validity Banner */}
      {isExpired ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-sm">
                Link de Autoenvio Expirado
              </h4>
              <p className="text-amber-800 mt-0.5">
                O link temporário venceu em{' '}
                <strong className="underline font-mono">
                  {tokenExpiresAt.toLocaleDateString('pt-BR')} às {tokenExpiresAt.toLocaleTimeString('pt-BR')}
                </strong>
                . Para prosseguir com o envio, realize a renovação do link.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              reissueCandidateToken(candidate.id);
              alert('Link de upload renovado com sucesso por mais 7 dias!');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#f5a90e]" />
            <span>Renovar Link (+7 dias)</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#03416A]" />
            <span>
              Link autenticado com chave única:{' '}
              <code className="text-[#082175] font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {candidate.document_token}
              </code>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5 text-[#9F8548]" />
            <span>Válido até: {tokenExpiresAt.toLocaleDateString('pt-BR')}</span>
          </span>
        </div>
      )}

      {/* Candidate Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548]">
            Admissão em {currentCompany.name}
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] mt-0.5">
            {candidate.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
            <span>{candidate.email}</span>
            <span aria-hidden="true">·</span>
            <span>{candidate.phone}</span>
            <span aria-hidden="true">·</span>
            <span>
              Etapa: <strong className="text-[#03416A] capitalize">{candidate.pipeline_stage}</strong>
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500">Documentos Aprovados</div>
          <div className="text-3xl font-extrabold text-[#082175] font-mono tabular-nums">
            {Math.round((candidateDocs.filter((d) => d.status === 'approved').length / 4) * 100)}%
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {candidateDocs.filter((d) => d.status === 'approved').length} de 4 documentos conferidos
          </div>
        </div>
      </div>

      {/* Document Checklist */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-[#082175] flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-[#9F8548]" />
          <span>Checklist de Documentos Obrigatórios</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REQUIRED_DOCS.map((docDef) => {
            const existingDoc = candidateDocs.find((d) => d.document_type === docDef.type);
            const isApproved = existingDoc?.status === 'approved';
            const isPending = existingDoc?.status === 'pending_review';
            const isRejected = existingDoc?.status === 'rejected';

            return (
              <div
                key={docDef.type}
                className={`p-4 rounded-xl border bg-white shadow-xs transition-all ${
                  isApproved
                    ? 'border-emerald-300'
                    : isPending
                    ? 'border-[#03416A]/40'
                    : isRejected
                    ? 'border-red-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700'
                          : isPending
                          ? 'bg-[#E0F4F7] text-[#03416A]'
                          : isRejected
                          ? 'bg-red-50 text-red-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-[#082175]">{docDef.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {docDef.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isApproved && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprovado</span>
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[11px] font-bold text-[#9F8548] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Em Análise</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="text-[11px] font-bold text-red-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejeitado</span>
                      </span>
                    )}
                    {!existingDoc && (
                      <span className="text-[11px] font-medium text-slate-400">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                {existingDoc && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 flex items-center justify-between">
                    <span className="truncate max-w-[260px]">
                      {existingDoc.storage_path}
                    </span>
                    <span className="text-slate-400 tabular-nums">
                      {new Date(existingDoc.uploaded_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {activeRoleView === 'candidate' ? (
                    <button
                      onClick={() => handleSimulateUpload(docDef.type)}
                      disabled={isExpired}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] disabled:opacity-40 text-white font-semibold text-xs transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#f5a90e]" />
                      <span>{existingDoc ? 'Reenviar Arquivo' : 'Fazer Upload do Arquivo'}</span>
                    </button>
                  ) : existingDoc ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Decisão do RH:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateDocumentStatus(existingDoc.id, 'approved')}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Aprovar</span>
                        </button>
                        <button
                          onClick={() => updateDocumentStatus(existingDoc.id, 'rejected')}
                          className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Rejeitar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full text-center text-xs text-slate-400 italic py-1">
                      Aguardando upload do candidato
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
