import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCode2,
  Loader2,
  Mail,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import type {
  AdminTheme,
  EmailCampaignRecord,
  EmailCampaignSegment,
  EmailTemplateCategory,
  EmailTemplateRecord,
} from '../types';
import {
  deleteEmailTemplate,
  dispatchEmailCampaign,
  fetchEmailCampaigns,
  fetchEmailTemplates,
  upsertEmailTemplate,
} from '../services/adminService';

interface AdminEmailsTabProps {
  theme: AdminTheme;
  adminUserId: string;
}

const VARIABLES = ['{{nome}}', '{{email}}', '{{empresa}}'] as const;

const SEGMENT_LABELS: Record<EmailCampaignSegment, string> = {
  todos_usuarios: 'Todos os usuários ativos',
  equipe_ccb: 'Equipe interna CCB',
  empresas_ativas: 'Empresas clientes ativas',
  empresas_pendentes: 'Empresas com cadastro pendente',
  leads_comerciais: 'Leads comerciais da Landing Page',
};

function renderPreviewHtml(html: string): string {
  return html
    .replaceAll('{{nome}}', 'Maria Silva')
    .replaceAll('{{email}}', 'maria.silva@empresa.com.br')
    .replaceAll('{{empresa}}', 'Empresa Cliente Exemplo Ltda');
}

export const AdminEmailsTab: React.FC<AdminEmailsTabProps> = ({ theme, adminUserId }) => {
  const isDark = theme === 'dark';
  const [templates, setTemplates] = useState<EmailTemplateRecord[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [slug, setSlug] = useState('comunicado-geral');
  const [nome, setNome] = useState('Comunicado CCBRH');
  const [categoria, setCategoria] = useState<EmailTemplateCategory>('comunicado');
  const [segmento, setSegmento] = useState<EmailCampaignSegment>('todos_usuarios');
  const [assunto, setAssunto] = useState('Novidades da plataforma CCBRH para {{nome}}');
  const [corpoHtml, setCorpoHtml] = useState(
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;"><h2 style="color:#082175;">Olá, {{nome}}!</h2><p>Temos novidades importantes na plataforma <strong>CCBRH</strong> para {{empresa}}.</p><p style="color:#64748b;font-size:12px;">Equipe CCB Soluções em RH</p></div>'
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tpls, cmps] = await Promise.all([fetchEmailTemplates(), fetchEmailCampaigns()]);
      setTemplates(tpls);
      setCampaigns(cmps);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao carregar templates e campanhas.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleLoadTemplate = (tpl: EmailTemplateRecord) => {
    setSelectedTemplateId(tpl.id);
    setSlug(tpl.slug);
    setNome(tpl.nome);
    setCategoria(tpl.categoria);
    setAssunto(tpl.assunto);
    setCorpoHtml(tpl.corpo_html);
  };

  const handleNewTemplate = () => {
    setSelectedTemplateId('');
    setSlug(`template-${Date.now().toString().slice(-4)}`);
    setNome('Novo Template');
    setAssunto('Assunto para {{nome}}');
    setCorpoHtml('<p>Olá, {{nome}} ({{empresa}}).</p>');
  };

  const handleSaveTemplate = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const saved = await upsertEmailTemplate({
        id: selectedTemplateId || undefined,
        slug,
        nome,
        assunto,
        corpo_html: corpoHtml,
        variaveis: ['nome', 'email', 'empresa'],
        categoria,
        updatedBy: adminUserId,
      });
      setSelectedTemplateId(saved.id);
      setFeedback({ type: 'success', message: `Template "${saved.nome}" salvo com sucesso.` });
      await loadAll();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao salvar template.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await deleteEmailTemplate(id);
      if (selectedTemplateId === id) setSelectedTemplateId('');
      setFeedback({ type: 'success', message: 'Template removido.' });
      await loadAll();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao remover template.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDispatchCampaign = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await dispatchEmailCampaign({
        nome,
        assunto,
        corpoHtml,
        segmento,
        templateId: selectedTemplateId || null,
        createdBy: adminUserId,
      });
      setFeedback({
        type: 'success',
        message: res.providerConfigured
          ? `Campanha disparada: ${res.sentCount}/${res.totalRecipients} enviado(s) (${res.failedCount} falha(s)).`
          : res.message || 'Campanha registrada em modo simulado.',
      });
      await loadAll();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao disparar campanha.',
      });
    } finally {
      setBusy(false);
    }
  };

  const cardClass = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const inputClass = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-100'
    : 'bg-white border-slate-300 text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
            Comunicação & Engajamento (Resend)
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">E-mail Marketing</h1>
        </div>
        <button
          type="button"
          onClick={handleNewTemplate}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#082175] text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#f5a90e]" />
          <span>Novo Template</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Templates */}
        <div className={`rounded-xl border p-4 space-y-3 ${cardClass}`}>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#f5a90e]" />
            Templates Salvos ({templates.length})
          </h2>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#f5a90e]" />
            </div>
          ) : templates.length === 0 ? (
            <p className={`text-xs ${mutedText}`}>Nenhum template cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`rounded-xl border p-3 flex items-start justify-between gap-2 ${
                    selectedTemplateId === tpl.id
                      ? 'border-[#f5a90e] bg-[#f5a90e]/10'
                      : isDark
                      ? 'border-slate-800 bg-slate-950/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleLoadTemplate(tpl)}
                    className="text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-xs font-bold truncate">{tpl.nome}</p>
                    <p className={`text-[10px] font-mono truncate ${mutedText}`}>{tpl.slug}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteTemplate(tpl.id)}
                    aria-label={`Remover template ${tpl.nome}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor & Preview */}
        <div className={`lg:col-span-2 rounded-xl border p-5 space-y-4 ${cardClass}`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-mono ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Segmentação de Público</label>
              <select
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as EmailCampaignSegment)}
                className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
              >
                {(Object.keys(SEGMENT_LABELS) as EmailCampaignSegment[]).map((seg) => (
                  <option key={seg} value={seg}>
                    {SEGMENT_LABELS[seg]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Assunto do E-mail</label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[11px] font-semibold ${mutedText}`}>Variáveis:</span>
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCorpoHtml((prev) => `${prev} ${v}`)}
                  className="px-2.5 py-1 rounded-lg bg-[#082175]/10 text-[#082175] dark:bg-[#f5a90e]/15 dark:text-[#f5a90e] text-[11px] font-mono font-bold cursor-pointer"
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${cardClass}`}
            >
              {showPreview ? <FileCode2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}</span>
            </button>
          </div>

          <textarea
            rows={6}
            value={corpoHtml}
            onChange={(e) => setCorpoHtml(e.target.value)}
            className={`w-full p-3 rounded-xl border text-xs font-mono ${inputClass}`}
          />

          {showPreview && (
            <div className="rounded-xl border border-slate-300 bg-white text-slate-900 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Preview HTML (variáveis simuladas)
              </p>
              <iframe
                title="Preview da campanha HTML"
                sandbox=""
                srcDoc={renderPreviewHtml(corpoHtml)}
                className="w-full h-56 rounded-lg border border-slate-200 bg-white"
              />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveTemplate()}
              className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold cursor-pointer ${cardClass}`}
            >
              Salvar Template
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDispatchCampaign()}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-xl bg-[#f5a90e] hover:bg-[#e59b05] text-[#082175] text-xs font-extrabold cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{busy ? 'Processando...' : 'Disparar Campanha'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Histórico de Envios */}
      <section className={`rounded-xl border p-5 space-y-3 ${cardClass}`}>
        <h2 className="text-sm font-bold">Histórico de Campanhas ({campaigns.length})</h2>
        {campaigns.length === 0 ? (
          <p className={`text-xs ${mutedText}`}>Nenhuma campanha enviada ou registrada até o momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={isDark ? 'bg-slate-800/70' : 'bg-slate-50'}>
                  <th className="py-2.5 px-3 font-bold">Campanha</th>
                  <th className="py-2.5 px-3 font-bold">Segmento</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 font-bold">Entregas</th>
                  <th className="py-2.5 px-3 font-bold">Data</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200'}>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3">
                      <p className="font-bold">{c.nome}</p>
                      <p className={`text-[11px] ${mutedText}`}>{c.assunto}</p>
                    </td>
                    <td className="py-2.5 px-3">{SEGMENT_LABELS[c.segmento] || c.segmento}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {c.enviados}/{c.total_destinatarios} ({c.falhas} falhas)
                    </td>
                    <td className={`py-2.5 px-3 ${mutedText}`}>
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
