import React, { useState } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  FolderArchive,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Check,
  ShieldCheck,
  ExternalLink,
  Trash2,
} from 'lucide-react';

export const DocumentRepositoryModule: React.FC = () => {
  const {
    documents,
    employees,
    candidates,
    updateDocumentStatus,
    deleteDocument,
    getDocumentSignedUrl,
  } = useCcb();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<'all' | 'employees' | 'candidates'>('all');
  const [docFeedback, setDocFeedback] = useState<string | null>(null);

  const totalDocs = documents.length;
  const approvedDocs = documents.filter((d) => d.status === 'approved').length;
  const pendingDocs = documents.filter((d) => d.status === 'pending_review').length;
  const rejectedDocs = documents.filter((d) => d.status === 'rejected').length;

  const filteredDocs = documents.filter((doc) => {
    if (filterType !== 'all' && doc.document_type !== filterType) return false;
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false;

    if (filterOwner === 'employees' && !doc.employee_id) return false;
    if (filterOwner === 'candidates' && !doc.candidate_id) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const emp = employees.find((e) => e.id === doc.employee_id);
      const cand = candidates.find((c) => c.id === doc.candidate_id);
      const ownerName = emp?.full_name || cand?.full_name || '';

      const matchName = ownerName.toLowerCase().includes(q);
      const matchPath = doc.storage_path.toLowerCase().includes(q);
      const matchType = doc.document_type.toLowerCase().includes(q);

      if (!matchName && !matchPath && !matchType) return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {docFeedback && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-center justify-between">
          <span>{docFeedback}</span>
          <button onClick={() => setDocFeedback(null)} className="underline ml-4">
            Fechar
          </button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Custódia e Gestão Eletrônica de Documentos
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Repositório Unificado de Documentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Armazenamento em conformidade com a LGPD e vínculo automático de arquivos de candidatos e funcionários.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#03416A]">
          <ShieldCheck className="w-4 h-4 text-[#9F8548]" />
          <span>Repositório Seguro Ativo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total de Arquivos</span>
            <div className="w-8 h-8 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center">
              <FolderArchive className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#082175] mt-2 font-mono tabular-nums">
            {totalDocs}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Armazenados no repositório da empresa
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Documentos Aprovados</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-2 font-mono tabular-nums">
            {approvedDocs}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Validados e aptos para contratação
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Aguardando Análise</span>
            <div className="w-8 h-8 rounded-lg bg-[#9F8548]/12 text-[#9F8548] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#9F8548] mt-2 font-mono tabular-nums">
            {pendingDocs}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Pendentes de conferência da equipe de RH
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Documentos Rejeitados</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-700 mt-2 font-mono tabular-nums">
            {rejectedDocs}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Com erro de imagem ou ilegíveis
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por colaborador ou arquivo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#082175]"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg font-semibold">
            <button
              onClick={() => setFilterOwner('all')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                filterOwner === 'all' ? 'bg-white text-[#082175] shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos ({documents.length})
            </button>
            <button
              onClick={() => setFilterOwner('employees')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                filterOwner === 'employees' ? 'bg-white text-[#082175] shadow-xs' : 'text-slate-600'
              }`}
            >
              Funcionários
            </button>
            <button
              onClick={() => setFilterOwner('candidates')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                filterOwner === 'candidates' ? 'bg-white text-[#082175] shadow-xs' : 'text-slate-600'
              }`}
            >
              Candidatos
            </button>
          </div>

          <select
            aria-label="Filtrar por Tipo de Documento"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#082175]"
          >
            <option value="all">Todos os Tipos de Documento</option>
            <option value="RG">RG (Identidade)</option>
            <option value="CPF">CPF</option>
            <option value="Comprovante_Residencia">Comprovante de Residência</option>
            <option value="Curriculo">Currículo</option>
          </select>

          <select
            aria-label="Filtrar por Situação"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#082175]"
          >
            <option value="all">Todas as Situações</option>
            <option value="approved">Aprovados</option>
            <option value="pending_review">Em Análise</option>
            <option value="rejected">Rejeitados</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          <strong className="text-[#082175]">{filteredDocs.length}</strong> documento(s) listado(s)
        </span>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px] bg-slate-50/50">
                <th className="py-3 px-4">Tipo de Documento</th>
                <th className="py-3 px-4">Titular (Colaborador / Candidato)</th>
                <th className="py-3 px-4">Caminho do Arquivo</th>
                <th className="py-3 px-4 text-center">Situação</th>
                <th className="py-3 px-4 text-right">Data de Envio</th>
                <th className="py-3 px-4 text-right">Conferência do RH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Nenhum documento encontrado com os critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const emp = employees.find((e) => e.id === doc.employee_id);
                  const cand = candidates.find((c) => c.id === doc.candidate_id);
                  const isEmployee = Boolean(emp);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#082175] flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#E0F4F7] text-[#03416A] flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-bold">{doc.document_type}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            {doc.document_type === 'Comprovante_Residencia'
                              ? 'Comprovante Residencial'
                              : doc.document_type}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#03416A]">
                          {isEmployee ? emp?.full_name : cand?.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-[#9F8548]">
                            {isEmployee ? 'Funcionário' : `Candidato (${cand?.pipeline_stage})`}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{isEmployee ? emp?.email : cand?.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        <span className="truncate block max-w-[260px]" title={doc.storage_path}>
                          {doc.storage_path}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-semibold inline-flex items-center gap-1 ${
                            doc.status === 'approved'
                              ? 'text-emerald-700'
                              : doc.status === 'pending_review'
                              ? 'text-[#9F8548]'
                              : 'text-red-700'
                          }`}
                        >
                          {doc.status === 'approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {doc.status === 'pending_review' && <Clock className="w-3.5 h-3.5" />}
                          {doc.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                          <span>
                            {doc.status === 'approved'
                              ? 'Aprovado'
                              : doc.status === 'pending_review'
                              ? 'Em Análise'
                              : 'Rejeitado'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-500">
                        {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={async () => {
                              const url = await getDocumentSignedUrl(doc.storage_path);
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              } else {
                                setDocFeedback(
                                  `Arquivo de referência "${doc.storage_path}" ainda não possui binário no Storage.`
                                );
                              }
                            }}
                            title="Abrir arquivo no Storage"
                            className="p-1.5 rounded border border-slate-200 text-[#03416A] hover:bg-slate-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await updateDocumentStatus(doc.id, 'approved');
                              } catch (err) {
                                setDocFeedback(
                                  err instanceof Error ? err.message : 'Erro ao aprovar documento.'
                                );
                              }
                            }}
                            title="Aprovar documento"
                            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                              doc.status === 'approved'
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Aprovar</span>
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await updateDocumentStatus(doc.id, 'rejected');
                              } catch (err) {
                                setDocFeedback(
                                  err instanceof Error ? err.message : 'Erro ao rejeitar documento.'
                                );
                              }
                            }}
                            title="Rejeitar documento"
                            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                              doc.status === 'rejected'
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                            }`}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Rejeitar</span>
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Excluir este registro de documento?')) return;
                              try {
                                await deleteDocument(doc.id, doc.storage_path);
                              } catch (err) {
                                setDocFeedback(
                                  err instanceof Error ? err.message : 'Erro ao excluir documento.'
                                );
                              }
                            }}
                            title="Excluir registro de documento"
                            className="p-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
