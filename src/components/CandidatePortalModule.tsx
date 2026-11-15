import React, { useState, useEffect } from 'react';
import { useCcb } from '../context/CcbContext';
import { Candidate, DocumentRecord, DocumentType } from '../types/database';
import { supabase } from '../lib/supabase';
import { triggerBrowserDownload } from '../utils/documentViewer';
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
  Loader2,
  KeyRound,
  ExternalLink,
  Download,
  X,
} from 'lucide-react';

interface CandidatePortalModuleProps {
  initialToken?: string | null;
  isPublic?: boolean;
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
  isPublic = false,
}) => {
  const {
    candidates,
    documents,
    currentCompany,
    uploadCandidateDocument,
    updateDocumentStatus,
    reissueCandidateToken,
    getDocumentSignedUrl,
  } = useCcb();

  const [tokenInput, setTokenInput] = useState<string>(initialToken || '');
  const [publicData, setPublicData] = useState<{
    candidate: Candidate;
    companyName: string;
    documents: DocumentRecord[];
  } | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

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

  const [activeRoleView, setActiveRoleView] = useState<'candidate' | 'recruiter'>(
    isPublic ? 'candidate' : 'recruiter'
  );
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    label: string;
    fileName: string;
    storagePath: string;
  } | null>(null);

  const loadPublicByToken = async (token: string) => {
    const clean = token.trim();
    if (!clean) return;
    setLoadingPublic(true);
    setPublicError(null);
    try {
      const { data, error } = await supabase.rpc('get_candidate_portal_by_token', {
        p_token: clean,
      });
      if (error || !data) {
        setPublicData(null);
        setPublicError('Chave de acesso não encontrada ou inválida.');
      } else {
        setPublicData({
          candidate: data.candidate as Candidate,
          companyName: data.company?.name || 'Empresa Contratante',
          documents: (data.documents || []) as DocumentRecord[],
        });
      }
    } catch {
      setPublicError('Erro ao consultar seu portal de documentos.');
    } finally {
      setLoadingPublic(false);
    }
  };

  useEffect(() => {
    if (isPublic && initialToken) {
      loadPublicByToken(initialToken);
    }
  }, [isPublic, initialToken]);

  if (isPublic && !publicData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#082175] text-[#f5a90e] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#082175]">Acessar Portal do Candidato</h2>
              <p className="text-xs text-slate-500">
                Informe a chave de acesso exclusiva enviada pela equipe ccbrh.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Cole seu token UUID aqui..."
              className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-[#082175]"
            />
            <button
              type="button"
              disabled={loadingPublic}
              onClick={() => loadPublicByToken(tokenInput)}
              className="px-4 py-2 rounded-lg bg-[#082175] text-white text-xs font-semibold hover:bg-[#0a2a8a] inline-flex items-center gap-1.5 cursor-pointer"
            >
              {loadingPublic && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Entrar</span>
            </button>
          </div>

          {publicError && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              {publicError}
            </p>
          )}
        </div>
      </div>
    );
  }

  const candidate = isPublic
    ? publicData!.candidate
    : candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

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
  const candidateDocs = isPublic
    ? publicData!.documents
    : documents.filter((d) => d.candidate_id === candidate.id);
  const companyDisplayName = isPublic
    ? publicData!.companyName
    : currentCompany?.name || 'Empresa';

  const handleFileUpload = async (type: DocumentType, file: File) => {
    if (isExpired) {
      setUploadFeedback(
        'Atenção: O link de autoenvio expirou. O envio foi bloqueado até a renovação do link.'
      );
      setTimeout(() => setUploadFeedback(null), 4000);
      return;
    }

    setUploadingType(type);
    setUploadFeedback(null);
    try {
      if (isPublic) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `portal/${candidate.document_token}/${type}_${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('ccbrh-docs')
          .upload(objectPath, file, { upsert: true });
        if (upErr) throw upErr;

        const { error: rpcErr } = await supabase.rpc('submit_candidate_document_by_token', {
          p_token: candidate.document_token,
          p_document_type: type,
          p_storage_path: `ccbrh-docs/${objectPath}`,
        });
        if (rpcErr) throw rpcErr;

        await loadPublicByToken(candidate.document_token);
      } else {
        await uploadCandidateDocument(candidate.id, type, file);
      }
      setUploadFeedback(`Documento "${type}" enviado com sucesso para a pasta segura!`);
      setTimeout(() => setUploadFeedback(null), 3500);
    } catch (err: unknown) {
      setUploadFeedback(
        err instanceof Error ? err.message : 'Erro ao enviar arquivo. Tente novamente.'
      );
    } finally {
      setUploadingType(null);
    }
  };

  const handleOpenOrDownloadDoc = async (
    storagePath: string,
    label: string,
    isDownload = false
  ) => {
    const rawFileName = storagePath.split('/').pop() || 'documento.pdf';
    const cleanFileName = rawFileName.replace(/^\d{10,}_/, '');
    const url = await getDocumentSignedUrl(
      storagePath,
      isDownload ? { download: cleanFileName } : undefined
    );
    if (!url) {
      setUploadFeedback(
        `O arquivo "${cleanFileName}" foi registrado antes da sincronização do Storage. Reenvie o arquivo PDF/Imagem para visualizá-lo.`
      );
      return;
    }

    if (isDownload) {
      triggerBrowserDownload(url, cleanFileName);
    } else {
      setPreviewDoc({
        url,
        label,
        fileName: cleanFileName,
        storagePath,
      });
    }
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

        {!isPublic && (
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
                    {c.full_name} ({c.pipeline_stage}){' '}
                    {new Date(c.token_expires_at) < now ? '[Link Vencido]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveRoleView('recruiter')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  activeRoleView === 'recruiter'
                    ? 'bg-white text-[#082175] shadow-xs'
                    : 'text-slate-600 hover:text-[#082175]'
                }`}
              >
                Revisão do RH
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleView('candidate')}
                className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                  activeRoleView === 'candidate'
                    ? 'bg-white text-[#082175] shadow-xs'
                    : 'text-slate-600 hover:text-[#082175]'
                }`}
              >
                Visão do Candidato
              </button>
            </div>
          </div>
        )}
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
              <h4 className="font-bold text-amber-950 text-sm">Link de Autoenvio Expirado</h4>
              <p className="text-amber-800 mt-0.5">
                O link temporário venceu em{' '}
                <strong className="underline font-mono">
                  {tokenExpiresAt.toLocaleDateString('pt-BR')} às{' '}
                  {tokenExpiresAt.toLocaleTimeString('pt-BR')}
                </strong>
                . Para prosseguir com o envio, solicite a renovação do link ao RH.
              </p>
            </div>
          </div>

          {!isPublic && (
            <button
              onClick={async () => {
                await reissueCandidateToken(candidate.id);
                setUploadFeedback('Link renovado com sucesso por mais 7 dias!');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>Renovar Link (+7 dias)</span>
            </button>
          )}
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
            Admissão em {companyDisplayName}
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
            const isUploadingThis = uploadingType === docDef.type;

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
                      <span className="text-[11px] font-medium text-slate-400">Pendente</span>
                    )}
                  </div>
                </div>

                {existingDoc && (
                  <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-700">
                        {(existingDoc.storage_path.split('/').pop() || existingDoc.storage_path).replace(
                          /^\d{10,}_/,
                          ''
                        )}
                      </span>
                      <span className="text-slate-400 tabular-nums">
                        Enviado em {new Date(existingDoc.uploaded_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 font-sans">
                      <button
                        type="button"
                        onClick={() =>
                          void handleOpenOrDownloadDoc(
                            existingDoc.storage_path,
                            docDef.label,
                            false
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[#082175] hover:bg-slate-100 text-[11px] font-semibold cursor-pointer shadow-2xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleOpenOrDownloadDoc(
                            existingDoc.storage_path,
                            docDef.label,
                            true
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E0F4F7]/70 border border-[#082175]/20 text-[#082175] hover:bg-[#E0F4F7] text-[11px] font-semibold cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Baixar</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isPublic || activeRoleView === 'candidate' ? (
                    <label
                      className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs transition-colors shadow-xs ${
                        isExpired || isUploadingThis ? 'opacity-40 pointer-events-none' : 'cursor-pointer'
                      }`}
                    >
                      {isUploadingThis ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f5a90e]" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#f5a90e]" />
                      )}
                      <span>
                        {isUploadingThis
                          ? 'Enviando arquivo...'
                          : existingDoc
                          ? 'Reenviar Arquivo (PDF/Imagem)'
                          : 'Anexar e Enviar Arquivo'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        disabled={isExpired || isUploadingThis}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(docDef.type, file);
                        }}
                        className="hidden"
                      />
                    </label>
                  ) : existingDoc ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Decisão do RH:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateDocumentStatus(existingDoc.id, 'approved')}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Aprovar</span>
                        </button>
                        <button
                          onClick={() => updateDocumentStatus(existingDoc.id, 'rejected')}
                          className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
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

        {/* Visualizador Integrado do Documento no Portal */}
        {previewDoc && (
          <div className="border border-[#082175]/20 rounded-xl overflow-hidden bg-slate-50 shadow-xs mt-4">
            <div className="px-4 py-2.5 bg-[#082175] text-white flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-[#f5a90e] shrink-0" />
                <span className="font-bold truncate">{previewDoc.label}</span>
                <span className="text-[11px] text-white/75 font-mono truncate">
                  ({previewDoc.fileName})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Nova Guia</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    void handleOpenOrDownloadDoc(previewDoc.storagePath, previewDoc.label, true)
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#f5a90e] hover:bg-[#e09806] text-[#082175] text-[11px] font-bold cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Baixar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded hover:bg-white/20 text-white cursor-pointer"
                  title="Fechar visualização"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={previewDoc.url}
              title={previewDoc.label}
              className="w-full h-[460px] bg-white border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
};
