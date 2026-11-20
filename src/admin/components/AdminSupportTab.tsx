import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Webhook,
} from 'lucide-react';
import type {
  AdminSupportTicket,
  AdminTheme,
  BillingWebhookLogRecord,
  SupportTicketStatus,
} from '../types';
import {
  fetchAdminSupportTickets,
  fetchWebhookLogs,
  respondAdminSupportTicket,
} from '../services/adminService';

interface AdminSupportTabProps {
  theme: AdminTheme;
  onOpenTicketsChange?: (count: number) => void;
}

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
  aberto: 'Recebido',
  em_analise: 'Em análise',
  planejado: 'Planejado',
  resolvido: 'Resolvido',
  descartado: 'Não priorizado',
};

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({
  theme,
  onOpenTicketsChange,
}) => {
  const isDark = theme === 'dark';
  const [subTab, setSubTab] = useState<'tickets' | 'webhooks'>('tickets');

  // Tickets state
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const [replyStatus, setReplyStatus] = useState<SupportTicketStatus>('em_analise');
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<BillingWebhookLogRecord[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhookProvider, setWebhookProvider] = useState('');
  const [webhookStatus, setWebhookStatus] = useState('');
  const [webhookSearch, setWebhookSearch] = useState('');
  const [selectedWebhook, setSelectedWebhook] = useState<BillingWebhookLogRecord | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await fetchAdminSupportTickets({
        status: ticketStatusFilter,
        search: ticketSearch,
      });
      setTickets(res.items || []);
      setOpenCount(res.open_count || 0);
      onOpenTicketsChange?.(res.open_count || 0);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao listar solicitações.',
      });
    } finally {
      setTicketsLoading(false);
    }
  }, [ticketStatusFilter, ticketSearch, onOpenTicketsChange]);

  const loadWebhooks = useCallback(async () => {
    setWebhooksLoading(true);
    try {
      const rows = await fetchWebhookLogs({
        provider: webhookProvider,
        status: webhookStatus,
        search: webhookSearch,
      });
      setWebhooks(rows);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao carregar logs de webhooks.',
      });
    } finally {
      setWebhooksLoading(false);
    }
  }, [webhookProvider, webhookStatus, webhookSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (subTab === 'tickets') {
        void loadTickets();
      } else {
        void loadWebhooks();
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [subTab, loadTickets, loadWebhooks]);

  const handleSelectTicket = (ticket: AdminSupportTicket) => {
    setSelectedTicket(ticket);
    setReplyStatus(ticket.status);
    setReplyText(ticket.resposta_equipe || '');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSavingReply(true);
    setFeedback(null);
    try {
      await respondAdminSupportTicket(selectedTicket.id, replyStatus, replyText);
      setFeedback({ type: 'success', message: 'Ticket atualizado e resposta salva com sucesso.' });
      await loadTickets();
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: replyStatus, resposta_equipe: replyText } : null
      );
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao responder solicitação.',
      });
    } finally {
      setSavingReply(false);
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9F8548]">
            Atendimento & Observabilidade
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-0.5">Suporte & Logs</h1>
        </div>

        <div className={`inline-flex rounded-xl border p-1 ${cardClass}`}>
          <button
            type="button"
            onClick={() => setSubTab('tickets')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === 'tickets' ? 'bg-[#082175] text-white' : ''
            }`}
          >
            <LifeBuoy className="w-4 h-4 text-[#f5a90e]" />
            <span>Tickets & Feedback</span>
            {openCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#f5a90e] text-[#082175]">
                {openCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('webhooks')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === 'webhooks' ? 'bg-[#082175] text-white' : ''
            }`}
          >
            <Webhook className="w-4 h-4 text-[#f5a90e]" />
            <span>Webhooks & Gateways</span>
          </button>
        </div>
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

      {subTab === 'tickets' ? (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 ${cardClass}`}>
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Buscar por título, descrição ou e-mail do usuário..."
                className={`w-full min-h-[44px] pl-9 pr-3 rounded-xl border text-xs ${inputClass}`}
              />
            </div>
            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
            >
              <option value="">Todos os status</option>
              {(Object.keys(STATUS_LABELS) as SupportTicketStatus[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Lista de tickets */}
            <div className={`lg:col-span-2 rounded-xl border p-3 space-y-2 max-h-[640px] overflow-y-auto ${cardClass}`}>
              {ticketsLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#f5a90e]" />
                </div>
              ) : tickets.length === 0 ? (
                <p className={`py-12 text-center text-xs ${mutedText}`}>
                  Nenhuma solicitação encontrada para este filtro.
                </p>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTicket(t)}
                    className={`w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer space-y-1.5 ${
                      selectedTicket?.id === t.id
                        ? 'border-[#f5a90e] bg-[#f5a90e]/10'
                        : isDark
                        ? 'border-slate-800 hover:bg-slate-800/60'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase text-[#9F8548]">{t.tipo}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {STATUS_LABELS[t.status]}
                      </span>
                    </div>
                    <p className="text-xs font-bold line-clamp-2">{t.titulo}</p>
                    <p className={`text-[11px] truncate ${mutedText}`}>
                      {t.user_name} · {t.user_email}
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Detalhe + Resposta */}
            <div className={`lg:col-span-3 rounded-xl border p-5 ${cardClass}`}>
              {!selectedTicket ? (
                <div className="py-20 text-center space-y-2">
                  <LifeBuoy className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-sm font-bold">Selecione uma solicitação</p>
                  <p className={`text-xs ${mutedText}`}>
                    Inspecione o contexto técnico e responda diretamente ao usuário.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-base font-extrabold">{selectedTicket.titulo}</h2>
                      <span className="text-[11px] font-mono text-[#9F8548] uppercase">
                        {selectedTicket.tipo}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 ${mutedText}`}>
                      {selectedTicket.user_name} ({selectedTicket.user_email}) ·{' '}
                      {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                    {selectedTicket.descricao}
                  </p>

                  {/* Contexto técnico */}
                  <div className={`rounded-xl border p-3 space-y-1.5 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                    <p className="text-[11px] font-bold flex items-center gap-1.5 text-[#9F8548]">
                      <Code2 className="w-3.5 h-3.5" />
                      Contexto técnico capturado
                    </p>
                    <pre className="text-[11px] font-mono overflow-x-auto max-h-40">
                      {JSON.stringify(selectedTicket.contexto || {}, null, 2)}
                    </pre>
                  </div>

                  {/* Formulário de resposta */}
                  <form onSubmit={handleSendReply} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Atualizar status</label>
                      <select
                        value={replyStatus}
                        onChange={(e) => setReplyStatus(e.target.value as SupportTicketStatus)}
                        className={`w-full min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
                      >
                        {(Object.keys(STATUS_LABELS) as SupportTicketStatus[]).map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABELS[st]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Resposta da equipe (visível ao usuário)</label>
                      <textarea
                        rows={4}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escreva o retorno técnico ou posicionamento de produto..."
                        className={`w-full p-3 rounded-xl border text-xs ${inputClass}`}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingReply}
                        className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-xl bg-[#082175] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        <Send className="w-4 h-4 text-[#f5a90e]" />
                        <span>{savingReply ? 'Salvando...' : 'Salvar resposta'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Sub-aba Webhooks & Gateways */
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 ${cardClass}`}>
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={webhookSearch}
                onChange={(e) => setWebhookSearch(e.target.value)}
                placeholder="Buscar por tipo de evento, ID externo ou erro..."
                className={`w-full min-h-[44px] pl-9 pr-3 rounded-xl border text-xs ${inputClass}`}
              />
            </div>
            <select
              value={webhookProvider}
              onChange={(e) => setWebhookProvider(e.target.value)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
            >
              <option value="">Todos os provedores</option>
              <option value="stripe">Stripe</option>
              <option value="asaas">Asaas</option>
              <option value="mercadopago">Mercado Pago</option>
              <option value="resend">Resend</option>
              <option value="manual">Manual</option>
            </select>
            <div className="flex gap-2">
              <select
                value={webhookStatus}
                onChange={(e) => setWebhookStatus(e.target.value)}
                className={`flex-1 min-h-[44px] px-3 rounded-xl border text-xs ${inputClass}`}
              >
                <option value="">Todos status</option>
                <option value="processed">Processado</option>
                <option value="failed">Falha</option>
                <option value="received">Recebido</option>
                <option value="ignored">Ignorado</option>
              </select>
              <button
                type="button"
                onClick={() => void loadWebhooks()}
                aria-label="Recarregar webhooks"
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border cursor-pointer ${cardClass}`}
              >
                <RefreshCw className={`w-4 h-4 text-[#f5a90e] ${webhooksLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className={`lg:col-span-3 rounded-xl border overflow-hidden ${cardClass}`}>
              {webhooksLoading ? (
                <div className="py-14 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#f5a90e]" />
                </div>
              ) : webhooks.length === 0 ? (
                <div className="py-14 text-center px-4 space-y-1.5">
                  <Webhook className="w-7 h-7 mx-auto text-slate-400" />
                  <p className="text-sm font-bold">Nenhum log de webhook registrado</p>
                  <p className={`text-xs ${mutedText}`}>
                    Eventos recebidos pelos gateways de pagamento aparecerão aqui em tempo real.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={isDark ? 'bg-slate-800/70' : 'bg-slate-50'}>
                        <th className="py-2.5 px-3 font-bold">Provedor</th>
                        <th className="py-2.5 px-3 font-bold">Evento</th>
                        <th className="py-2.5 px-3 font-bold">Status</th>
                        <th className="py-2.5 px-3 font-bold">Data</th>
                      </tr>
                    </thead>
                    <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-slate-200'}>
                      {webhooks.map((w) => (
                        <tr
                          key={w.id}
                          onClick={() => setSelectedWebhook(w)}
                          className={`cursor-pointer ${
                            selectedWebhook?.id === w.id
                              ? 'bg-[#f5a90e]/10'
                              : isDark
                              ? 'hover:bg-slate-800/40'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold uppercase">{w.provider}</td>
                          <td className="py-2.5 px-3 font-mono">{w.event_type}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                w.status === 'failed'
                                  ? 'bg-red-500/15 text-red-600'
                                  : w.status === 'processed'
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {w.status} {w.http_status ? `(${w.http_status})` : ''}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 ${mutedText}`}>
                            {new Date(w.created_at).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={`lg:col-span-2 rounded-xl border p-4 space-y-2 ${cardClass}`}>
              <p className="text-xs font-bold flex items-center gap-1.5 text-[#9F8548]">
                <Code2 className="w-4 h-4" />
                Inspetor de Payload JSON
              </p>
              {!selectedWebhook ? (
                <p className={`text-xs py-10 text-center ${mutedText}`}>
                  Clique em um evento na tabela para inspecionar o payload JSON completo.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedWebhook.error_message && (
                    <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
                      {selectedWebhook.error_message}
                    </div>
                  )}
                  <pre
                    className={`p-3 rounded-xl border text-[11px] font-mono overflow-auto max-h-[420px] ${
                      isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {JSON.stringify(selectedWebhook.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
