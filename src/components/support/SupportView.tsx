import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  Info,
  Lightbulb,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { useCcb } from '../../context/CcbContext';
import type {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketType,
} from '../../admin/types';
import {
  SUPPORT_DESC_MAX,
  SUPPORT_DESC_MIN,
  SUPPORT_TITLE_MAX,
  SUPPORT_TITLE_MIN,
  buildSupportTechnicalContext,
  createSupportTicket,
  listMySupportTickets,
  validateSupportTicketInput,
} from '../../services/supportService';
import { ModuleBanner } from '../ui/ModuleBanner';

const TICKET_TYPE_CONFIG: Record<
  SupportTicketType,
  {
    label: string;
    shortDescription: string;
    titlePlaceholder: string;
    descPlaceholder: string;
    icon: React.FC<{ className?: string }>;
    activeClasses: string;
  }
> = {
  melhoria: {
    label: 'Sugerir melhoria',
    shortDescription: 'Aprimorar fluxos, telas ou relatórios já existentes',
    titlePlaceholder: 'Ex.: Adicionar filtro por filial no resumo da folha',
    descPlaceholder:
      'Descreva qual tela ou fluxo pode melhorar, qual dor você enfrenta hoje e como gostaria que funcionasse...',
    icon: Lightbulb,
    activeClasses: 'border-[#082175] bg-[#E0F4F7]/50 text-[#082175] ring-2 ring-[#082175]/15',
  },
  bug: {
    label: 'Reportar bug',
    shortDescription: 'Relatar erro, lentidão ou comportamento inesperado',
    titlePlaceholder: 'Ex.: Erro ao gerar holerite de colaborador PJ sem NFS-e',
    descPlaceholder:
      'Informe o passo a passo para reproduzir o problema, o que aconteceu e o que era esperado...',
    icon: Bug,
    activeClasses: 'border-red-600 bg-red-50 text-red-800 ring-2 ring-red-600/15',
  },
  funcionalidade: {
    label: 'Nova funcionalidade',
    shortDescription: 'Solicitar um recurso novo para sua rotina de RH/DP',
    titlePlaceholder: 'Ex.: Exportação automática de relatório de férias vencidas',
    descPlaceholder:
      'Explique qual nova funcionalidade ajudaria sua equipe, quem utilizaria e o impacto esperado...',
    icon: Sparkles,
    activeClasses: 'border-[#9F8548] bg-amber-50 text-[#03416A] ring-2 ring-[#f5a90e]/25',
  },
};

const STATUS_BADGE_MAP: Record<
  SupportTicketStatus,
  { label: string; classes: string }
> = {
  aberto: {
    label: 'Recebido',
    classes: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  em_analise: {
    label: 'Em análise',
    classes: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  planejado: {
    label: 'Planejado',
    classes: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  resolvido: {
    label: 'Resolvido',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  descartado: {
    label: 'Não priorizado',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

const formatDateTimePtBr = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export const SupportView: React.FC = () => {
  const { authUser, currentCompany } = useCcb();

  const [tipo, setTipo] = useState<SupportTicketType>('melhoria');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [moduleUnavailable, setModuleUnavailable] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!authUser?.id) return;
    setLoadingList(true);
    setListError(null);
    const result = await listMySupportTickets(authUser.id);
    setTickets(result.tickets);
    setModuleUnavailable(result.moduleUnavailable);
    setListError(result.error);
    setLoadingList(false);
  }, [authUser?.id]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser?.id) return;

    setSubmitFeedback(null);
    const validation = validateSupportTicketInput(titulo, descricao);
    if (!validation.valid) {
      setSubmitFeedback({
        type: 'error',
        message: validation.error || 'Revise os campos obrigatórios.',
      });
      return;
    }

    setSubmitting(true);
    const contexto = buildSupportTechnicalContext({
      activeTab: 'support',
      companyName: currentCompany?.name ?? null,
    });

    const result = await createSupportTicket({
      userId: authUser.id,
      tipo,
      titulo,
      descricao,
      planTier: currentCompany?.porte ?? null,
      contexto,
    });
    setSubmitting(false);

    if (result.moduleUnavailable) {
      setModuleUnavailable(true);
      setSubmitFeedback({
        type: 'error',
        message:
          'O canal de suporte ainda está sendo ativado no ambiente. Tente novamente em breve.',
      });
      return;
    }

    if (result.error || !result.ticket) {
      setSubmitFeedback({
        type: 'error',
        message: result.error || 'Não foi possível registrar sua solicitação.',
      });
      return;
    }

    setTickets((prev) => [result.ticket as SupportTicket, ...prev]);
    setTitulo('');
    setDescricao('');
    setSubmitFeedback({
      type: 'success',
      message: 'Solicitação enviada com sucesso! Nossa equipe acompanhará por aqui.',
    });
  };

  const activeTypeConfig = TICKET_TYPE_CONFIG[tipo];
  const titleLen = titulo.trim().length;
  const descLen = descricao.trim().length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Cabeçalho */}
      <ModuleBanner
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#f5a90e] text-[10px] font-bold">
            <LifeBuoy className="w-3 h-3" />
            <span>Central de Suporte & Evolução do Produto</span>
          </span>
        }
        title="Suporte e Solicitações"
        subtitle="Envie sugestões de melhoria, reporte problemas técnicos ou peça novas funcionalidades diretamente para a equipe CCBRH."
        actions={
          <button
            type="button"
            onClick={() => void loadTickets()}
            disabled={loadingList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#f5a90e] ${loadingList ? 'animate-spin' : ''}`} />
            <span>Atualizar histórico</span>
          </button>
        }
      />

      {/* Fallback gracioso se a tabela ainda não existir no banco remoto */}
      {moduleUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3 text-amber-900">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold">Módulo de Suporte em preparação no servidor</h2>
            <p className="text-xs leading-relaxed text-amber-800">
              A tabela <code className="font-mono font-semibold">suporte_solicitacoes</code> ainda
              não foi aplicada no banco de dados deste ambiente. Assim que a migration for
              executada pelo administrador, suas solicitações aparecerão normalmente aqui.
            </p>
          </div>
        </div>
      )}

      {/* Formulário de Nova Solicitação */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#082175]">Nova solicitação</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Escolha a categoria que melhor descreve sua demanda para agilizar nossa triagem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Seletor visual de tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(TICKET_TYPE_CONFIG) as SupportTicketType[]).map((key) => {
              const cfg = TICKET_TYPE_CONFIG[key];
              const Icon = cfg.icon;
              const selected = tipo === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  aria-pressed={selected}
                  className={`min-h-[44px] text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    selected
                      ? cfg.activeClasses
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{cfg.label}</p>
                    <p className="text-[11px] opacity-80 mt-0.5 leading-snug">
                      {cfg.shortDescription}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Aviso transparente de metadados técnicos quando tipo = bug */}
          {tipo === 'bug' && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 flex items-start gap-2.5 text-sky-900">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-700" />
              <p className="text-xs leading-relaxed">
                Para ajudar no diagnóstico, incluiremos automaticamente metadados técnicos não
                sensíveis no envio (tela atual, navegador, resolução de tela, idioma e data/hora).
                Nenhum dado pessoal de colaboradores ou senha é coletado.
              </p>
            </div>
          )}

          {/* Título */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="support-ticket-title"
                className="text-xs font-semibold text-[#03416A]"
              >
                Título da solicitação <span className="text-red-600">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  titleLen > 0 && (titleLen < SUPPORT_TITLE_MIN || titleLen > SUPPORT_TITLE_MAX)
                    ? 'text-red-600 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {titulo.length}/{SUPPORT_TITLE_MAX}
              </span>
            </div>
            <input
              id="support-ticket-title"
              type="text"
              maxLength={SUPPORT_TITLE_MAX}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={activeTypeConfig.titlePlaceholder}
              disabled={submitting || moduleUnavailable}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#082175] disabled:bg-slate-100"
            />
            <p className="text-[11px] text-slate-500">
              Mínimo de {SUPPORT_TITLE_MIN} caracteres.
            </p>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="support-ticket-description"
                className="text-xs font-semibold text-[#03416A]"
              >
                Descrição detalhada <span className="text-red-600">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  descLen > 0 && (descLen < SUPPORT_DESC_MIN || descLen > SUPPORT_DESC_MAX)
                    ? 'text-red-600 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {descricao.length}/{SUPPORT_DESC_MAX}
              </span>
            </div>
            <textarea
              id="support-ticket-description"
              rows={5}
              maxLength={SUPPORT_DESC_MAX}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={activeTypeConfig.descPlaceholder}
              disabled={submitting || moduleUnavailable}
              className="w-full min-h-[120px] px-3.5 py-3 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#082175] disabled:bg-slate-100 resize-y"
            />
            <p className="text-[11px] text-slate-500">
              Mínimo de {SUPPORT_DESC_MIN} caracteres. Quanto mais contexto, mais rápido o retorno.
            </p>
          </div>

          {/* Feedback de envio */}
          {submitFeedback && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2.5 border ${
                submitFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {submitFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{submitFeedback.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting || moduleUnavailable}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#f5a90e]" />
                  <span>Enviar solicitação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Histórico: Minhas solicitações */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#082175]">Minhas solicitações</h2>
            <p className="text-xs text-slate-500">
              Acompanhe o andamento e o retorno da equipe técnica sobre seus chamados.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
            {tickets.length} {tickets.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {loadingList ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#082175]" />
            <span className="text-xs font-medium">Carregando suas solicitações...</span>
          </div>
        ) : listError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-3 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Erro ao carregar histórico: {listError}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="min-h-[44px] px-3 py-1.5 rounded-lg bg-red-700 text-white font-semibold cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center space-y-2">
            <MessageSquareText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Você ainda não enviou nenhuma solicitação
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Use o formulário acima sempre que tiver uma sugestão de melhoria, identificar um bug
              ou quiser sugerir um novo recurso.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const typeMeta = TICKET_TYPE_CONFIG[ticket.tipo];
              const statusMeta = STATUS_BADGE_MAP[ticket.status];
              const TypeIcon = typeMeta.icon;
              return (
                <article
                  key={ticket.id}
                  className="rounded-xl border border-slate-200 p-4 sm:p-5 bg-white hover:border-slate-300 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#082175] flex items-center justify-center shrink-0 mt-0.5">
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 break-words">
                          {ticket.titulo}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-semibold text-[#03416A]">{typeMeta.label}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTimePtBr(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.classes}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                    {ticket.descricao}
                  </p>

                  {ticket.resposta_equipe && (
                    <div className="rounded-xl border border-[#082175]/20 bg-[#E0F4F7]/45 p-3.5 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#082175]">
                        Retorno da equipe CCBRH
                      </p>
                      <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                        {ticket.resposta_equipe}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Atualizado em {formatDateTimePtBr(ticket.updated_at)}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
