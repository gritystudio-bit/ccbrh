import React, { useState } from 'react';
import {
  Candidate,
  DocumentRecord,
  DocumentStatus,
  DocumentType,
} from '../../types/database';
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

const CANDIDATE_DOC_LABELS: Record<DocumentType, string> = {
  RG: 'Documento de Identidade (RG)',
  CPF: 'Cadastro de Pessoa Física (CPF)',
  Comprovante_Residencia: 'Comprovante de Residência',
  Curriculo: 'Currículo Atualizado',
  ASO: 'Exame Admissional (ASO)',
  Carteira_Trabalho: 'Carteira de Trabalho Digital (CTPS)',
  Contrato: 'Proposta / Minuta de Contrato',
  Comprovante_Bancario: 'Comprovante de Conta Bancária',
  Diploma_Certificado: 'Diploma / Certificado',
  Outros: 'Outros Documentos',
};

interface CandidateDocumentsModalProps {
  candidate: Candidate | null;
  documents: DocumentRecord[];
  onClose: () => void;
  onUploadDocument: (candidateId: string, docType: DocumentType, file: File) => Promise<void>;
  onUpdateStatus: (docId: string, status: DocumentStatus) => Promise<void>;
  onDeleteDocument: (docId: string, storagePath: string) => Promise<void>;
  onOpenDocument: (
    storagePath: string,
    docLabel?: string,
    isDownload?: boolean
  ) => Promise<{ url: string; fileName: string } | null>;
}

export const CandidateDocumentsModal: React.FC<CandidateDocumentsModalProps> = ({
  candidate,
  documents,
  onClose,
  onUploadDocument,
  onUpdateStatus,
  onDeleteDocument,
  onOpenDocument,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType>('RG');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    label: string;
    fileName: string;
    storagePath: string;
  } | null>(null);

  if (!candidate) return null;

  const candidateDocs = documents.filter((d) => d.candidate_id === candidate.id);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setBusy(true);
    setNotice(null);
    try {
      await onUploadDocument(candidate.id, selectedType, selectedFile);
      setSelectedFile(null);
      setNotice(`Documento (${CANDIDATE_DOC_LABELS[selectedType]}) anexado ao candidato.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-xl text-xs">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
              Dossiê de Admissão · Recrutamento e Seleção
            </p>
            <h3 className="text-base font-bold text-[#082175] mt-0.5">
              Documentos de {candidate.full_name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ao concluir a etapa <strong>4. Aprovados para Contratação</strong>, todos os arquivos validados migram automaticamente para o perfil em <strong>Funcionários</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notice && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center justify-between">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="underline ml-2">
              OK
            </button>
          </div>
        )}

        {/* Upload pelo RH */}
        <form
          onSubmit={handleUpload}
          className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
        >
          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">Tipo de Documento</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DocumentType)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2"
            >
              {(Object.keys(CANDIDATE_DOC_LABELS) as DocumentType[]).map((t) => (
                <option key={t} value={t}>
                  {CANDIDATE_DOC_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-5">
            <label className="block font-semibold text-slate-700 mb-1">Arquivo</label>
            <input
              type="file"
              required
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={busy || !selectedFile}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>{busy ? 'Enviando...' : 'Anexar'}</span>
            </button>
          </div>
        </form>

        {/* Lista de Documentos do Candidato */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-bold text-slate-700">
              Arquivos do Candidato ({candidateDocs.length})
            </h4>
            {candidate.resume_path && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setNotice(null);
                    const res = await onOpenDocument(
                      candidate.resume_path!,
                      'Currículo da Candidatura',
                      false
                    );
                    if (res?.url) {
                      setPreviewDoc({
                        url: res.url,
                        label: 'Currículo da Candidatura',
                        fileName: res.fileName,
                        storagePath: candidate.resume_path!,
                      });
                    } else {
                      setNotice(
                        'Este currículo foi enviado antes da ativação do bucket de Storage. Selecione o PDF "Curriculo_Gabriel Rocha - 2024.pdf" no campo "Arquivo" acima (Tipo: Currículo Atualizado) e clique em "Anexar" para gravar o PDF real.'
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[#082175] hover:underline font-semibold cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Currículo</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setNotice(null);
                    const res = await onOpenDocument(
                      candidate.resume_path!,
                      'Currículo da Candidatura',
                      true
                    );
                    if (!res?.url) {
                      setNotice(
                        'Este currículo foi enviado antes da ativação do bucket de Storage. Selecione o PDF "Curriculo_Gabriel Rocha - 2024.pdf" no campo "Arquivo" acima (Tipo: Currículo Atualizado) e clique em "Anexar" para gravar o PDF real.'
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[#03416A] hover:underline font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Currículo</span>
                </button>
              </div>
            )}
          </div>

          {candidateDocs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-1">
              <FileText className="w-7 h-7 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">
                Nenhum documento complementar enviado ainda.
              </p>
              <p>Envie o link do Portal ao candidato ou anexe os documentos manualmente acima.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {candidateDocs.map((doc) => {
                const fileName = doc.storage_path.split('/').pop() || doc.storage_path;
                return (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-white flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#082175]">
                            {CANDIDATE_DOC_LABELS[doc.document_type] || doc.document_type}
                          </span>
                          {doc.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Aprovado
                            </span>
                          )}
                          {doc.status === 'pending_review' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> Pendente
                            </span>
                          )}
                          {doc.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> Rejeitado
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {fileName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          setNotice(null);
                          const docLabel =
                            CANDIDATE_DOC_LABELS[doc.document_type] || doc.document_type;
                          const res = await onOpenDocument(
                            doc.storage_path,
                            docLabel,
                            false
                          );
                          if (res?.url) {
                            setPreviewDoc({
                              url: res.url,
                              label: docLabel,
                              fileName: res.fileName || fileName,
                              storagePath: doc.storage_path,
                            });
                          } else {
                            setNotice(
                              `O arquivo "${fileName}" foi registrado antes da ativação do bucket de Storage. Selecione o PDF original acima e clique em "Anexar" para substituir pelo arquivo real.`
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[#082175] hover:bg-slate-50 font-semibold cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Ver</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setNotice(null);
                          const docLabel =
                            CANDIDATE_DOC_LABELS[doc.document_type] || doc.document_type;
                          const res = await onOpenDocument(
                            doc.storage_path,
                            docLabel,
                            true
                          );
                          if (!res?.url) {
                            setNotice(
                              `O arquivo "${fileName}" foi registrado antes da ativação do bucket de Storage. Selecione o PDF original acima e clique em "Anexar" para substituir pelo arquivo real.`
                            );
                          }
                        }}
                        title="Baixar arquivo"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#082175]/20 bg-[#E0F4F7]/60 text-[#082175] hover:bg-[#E0F4F7] font-semibold cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Baixar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(doc.id, 'approved')}
                        title="Aprovar documento"
                        className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(doc.id, 'rejected')}
                        title="Rejeitar documento"
                        className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id, doc.storage_path)}
                        title="Excluir documento"
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visualizador Integrado do Documento / Currículo */}
        {previewDoc && (
          <div className="border border-[#082175]/20 rounded-xl overflow-hidden bg-slate-50 shadow-inner">
            <div className="px-4 py-2.5 bg-[#082175] text-white flex flex-wrap items-center justify-between gap-2">
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
                    onOpenDocument(previewDoc.storagePath, previewDoc.label, true)
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
              className="w-full h-[380px] bg-white border-0"
            />
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#082175] text-white font-semibold cursor-pointer"
          >
            Concluir Conferência
          </button>
        </div>
      </div>
    </div>
  );
};
