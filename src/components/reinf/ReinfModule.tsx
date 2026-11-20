import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCcb } from '../../context/CcbContext';
import type {
  ReinfContributorConfig,
  ReinfEventRecord,
  ReinfEventSeries,
} from '../../types/database';
import {
  buildDefaultReinfContributorConfig,
  buildReinfR1000Event,
  buildReinfR1070Event,
  buildReinfR2010Event,
  buildReinfR2020Event,
  buildReinfR2060Event,
  buildReinfR2098Event,
  buildReinfR2099Event,
  buildReinfR4010Event,
  buildReinfR4020FromPjPayrollEntry,
  buildReinfR4020ManualEvent,
  buildReinfR4040Event,
  buildReinfR4080Event,
  buildReinfR4099Event,
  buildReinfR9000Event,
  REINF_VERSION_LABEL,
  round2,
  type BuiltReinfEventDraft,
} from '../../utils/reinf/reinfEngine';
import {
  createReinfEventsBatch,
  deleteReinfEvent,
  fetchReinfContributorConfig,
  fetchReinfEvents,
  markReinfEventExcluded,
  transmitReinfEventsBatch,
  upsertReinfContributorConfig,
} from '../../services/reinfService';
import { ReinfEventInspectorModal } from './ReinfEventInspectorModal';
import { ReinfContributorConfigTab } from './ReinfContributorConfigTab';
import { ReinfTablesTotalsTab } from './ReinfTablesTotalsTab';
import {
  ReinfManualEventsTab,
  type ReinfManualEventFormPayload,
} from './ReinfManualEventsTab';
import { ModuleBanner } from '../ui/ModuleBanner';
import {
  AlertCircle,
  BookOpenCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Code2,
  FilePlus2,
  Filter,
  Landmark,
  Loader2,
  Lock,
  ReceiptText,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';

type ReinfSubTab = 'queue' | 'manual' | 'tables_totals' | 'config';

const formatBRL = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const getCurrentCompetence = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const STATUS_META: Record<ReinfEventRecord['status'], { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: 'Pendente', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  validated: {
    label: 'Validado v2.1.2b',
    className: 'bg-sky-50 text-[#082175] border-sky-200',
  },
  transmitted: {
    label: 'Em Processamento',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  accepted: {
    label: 'Recibo RFB Ativo',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  rejected: {
    label: 'Crítica Anexo II',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  excluded: {
    label: 'Excluído (R-9000)',
    className: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
  },
};

export const ReinfModule: React.FC = () => {
  const { currentTenantId, currentCompany, employees, payrollEntries } = useCcb();

  const [subTab, setSubTab] = useState<ReinfSubTab>('queue');
  const [competence, setCompetence] = useState<string>(getCurrentCompetence());
  const [seriesFilter, setSeriesFilter] = useState<'all' | ReinfEventSeries>('all');
  const [config, setConfig] = useState<ReinfContributorConfig>(() =>
    buildDefaultReinfContributorConfig(currentTenantId)
  );
  const [events, setEvents] = useState<ReinfEventRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [inspectingEvent, setInspectingEvent] = useState<ReinfEventRecord | null>(null);

  const pjEntriesForCompetence = useMemo(
    () =>
      payrollEntries.filter((entry) => {
        const emp = employees.find((e) => e.id === entry.employee_id);
        const regime = entry.contract_type || emp?.contract_type || 'clt';
        return entry.competence === competence && regime === 'pj';
      }),
    [payrollEntries, employees, competence]
  );

  const loadReinfData = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const [cfg, evts] = await Promise.all([
        fetchReinfContributorConfig(currentTenantId),
        fetchReinfEvents(currentTenantId),
      ]);
      setConfig(cfg);
      setEvents(evts);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar dados da EFD-Reinf.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    void loadReinfData();
  }, [loadReinfData]);

  // 1. Gerar R-1000 Informações do Contribuinte
  const handleGenerateR1000 = async () => {
    if (!currentCompany) return;
    setBusyAction('r1000');
    setFeedback(null);
    try {
      const draft = buildReinfR1000Event({
        company: currentCompany,
        config,
        iniValid: `${competence.slice(0, 4)}-01`,
        sequence: 1,
      });
      await createReinfEventsBatch(currentTenantId, [draft]);
      await loadReinfData();
      setFeedback({
        type: 'success',
        text: 'Evento R-1000 (Informações do Contribuinte) gerado e validado no padrão v2.1.2b.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao gerar R-1000.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 2. Sincronizar Prestadores PJ da Folha para R-4020
  const handleSyncPjPayrollToR4020 = async () => {
    if (!currentCompany) return;
    if (pjEntriesForCompetence.length === 0) {
      setFeedback({
        type: 'error',
        text: `Nenhum lançamento PJ encontrado na competência ${competence}. Gere primeiro na Folha de Pagamento ou lance manualmente na aba "Lançamentos Avulsos".`,
      });
      return;
    }

    setBusyAction('sync_r4020');
    setFeedback(null);
    try {
      const drafts: BuiltReinfEventDraft[] = [];
      pjEntriesForCompetence.forEach((entry, idx) => {
        const emp = employees.find((e) => e.id === entry.employee_id);
        if (!emp) return;
        drafts.push(
          buildReinfR4020FromPjPayrollEntry({
            company: currentCompany,
            config,
            employee: emp,
            entry,
            sequence: 20 + idx,
          })
        );
      });

      await createReinfEventsBatch(currentTenantId, drafts);
      await loadReinfData();
      setFeedback({
        type: 'success',
        text: `${drafts.length} evento(s) R-4020 gerados a partir da Folha PJ (${competence}).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao gerar eventos R-4020.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 3. Fechamento / Reabertura Série R-4000 (R-4099) ou Série R-2000 (R-2099 / R-2098)
  const handleControlEvent = async (action: 'close_r4000' | 'reopen_r4000' | 'close_r2000' | 'reopen_r2000') => {
    if (!currentCompany) return;
    setBusyAction(action);
    setFeedback(null);
    try {
      let draft: BuiltReinfEventDraft;
      if (action === 'close_r4000') {
        draft = buildReinfR4099Event({
          company: currentCompany,
          config,
          competence,
          fechRet: 0,
          eventsForCompetence: events,
        });
      } else if (action === 'reopen_r4000') {
        draft = buildReinfR4099Event({
          company: currentCompany,
          config,
          competence,
          fechRet: 1,
          eventsForCompetence: events,
        });
      } else if (action === 'close_r2000') {
        draft = buildReinfR2099Event({
          company: currentCompany,
          config,
          competence,
          eventsForCompetence: events,
        });
      } else {
        draft = buildReinfR2098Event({
          company: currentCompany,
          config,
          competence,
        });
      }

      await createReinfEventsBatch(currentTenantId, [draft]);
      await loadReinfData();
      setFeedback({
        type: 'success',
        text: `Evento ${draft.eventCode} (${draft.eventName}) gerado para ${competence}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao gerar evento de controle.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 4. Lançamento Avulso (R-4010, R-4020, R-2010, R-2020, R-2060, R-4040, R-4080, R-1070)
  const handleGenerateManualEvent = async (payload: ReinfManualEventFormPayload) => {
    if (!currentCompany) return;
    setBusyAction('manual');
    setFeedback(null);
    try {
      let draft: BuiltReinfEventDraft;
      const dtFallback = /^\d{4}-\d{2}-\d{2}$/.test(payload.dateOrDocNum)
        ? payload.dateOrDocNum
        : `${competence}-20`;

      if (payload.kind === 'R-4010') {
        draft = buildReinfR4010Event({
          company: currentCompany,
          config,
          input: {
            competence,
            cpfBenef: payload.doc,
            nomeBenef: payload.name,
            natRend: payload.natRendOrService,
            dtFG: dtFallback,
            vlrRendBruto: payload.grossAmount,
            vlrRendTrib: payload.natRendOrService === '12001' ? 0 : payload.grossAmount,
            vlrIR: payload.irAmount,
            observ: payload.observ,
          },
        });
      } else if (payload.kind === 'R-4020') {
        const csrf = round2(payload.csrfAmount);
        draft = buildReinfR4020ManualEvent({
          company: currentCompany,
          config,
          input: {
            competence,
            cnpjBenef: payload.doc,
            nomeBenef: payload.name,
            natRend: payload.natRendOrService,
            dtFG: dtFallback,
            vlrBruto: payload.grossAmount,
            vlrIR: payload.irAmount,
            vlrCSLL: csrf > 0 ? round2((csrf * 1) / 4.65) : 0,
            vlrCofins: csrf > 0 ? round2((csrf * 3) / 4.65) : 0,
            vlrPP: csrf > 0 ? round2((csrf * 0.65) / 4.65) : 0,
            observ: payload.observ,
          },
        });
      } else if (payload.kind === 'R-2010') {
        draft = buildReinfR2010Event({
          company: currentCompany,
          config,
          input: {
            competence,
            cnpjPrestador: payload.doc,
            nomePrestador: payload.name,
            numDocto: payload.dateOrDocNum || 'NF-001',
            dtEmissaoNF: `${competence}-20`,
            vlrBruto: payload.grossAmount,
            vlrBaseRet: payload.grossAmount,
            indCPRB: payload.indCprb ?? 0,
            tpServico: payload.natRendOrService,
          },
        });
      } else if (payload.kind === 'R-2020') {
        draft = buildReinfR2020Event({
          company: currentCompany,
          config,
          input: {
            competence,
            cnpjTomador: payload.doc,
            nomeTomador: payload.name,
            numDocto: payload.dateOrDocNum || 'NF-001',
            dtEmissaoNF: `${competence}-20`,
            vlrBruto: payload.grossAmount,
            vlrBaseRet: payload.grossAmount,
            tpServico: payload.natRendOrService,
          },
        });
      } else if (payload.kind === 'R-2060') {
        draft = buildReinfR2060Event({
          company: currentCompany,
          config,
          input: {
            competence,
            codAtivEcon: payload.natRendOrService || '00000010',
            vlrRecBrutaAtiv: payload.grossAmount,
            aliquotaPercent: payload.aliquotaCprb || 2.5,
          },
        });
      } else if (payload.kind === 'R-4040') {
        draft = buildReinfR4040Event({
          company: currentCompany,
          config,
          input: {
            competence,
            natRend: payload.natRendOrService === '19009' ? '19009' : '19001',
            dtFG: dtFallback,
            vlrLiq: payload.grossAmount,
            descr: payload.name || payload.observ || 'Pagamento não identificado',
          },
        });
      } else if (payload.kind === 'R-4080') {
        draft = buildReinfR4080Event({
          company: currentCompany,
          config,
          input: {
            competence,
            cnpjFonte: payload.doc,
            nomeFonte: payload.name,
            natRend: payload.natRendOrService || '20001',
            dtFG: dtFallback,
            vlrBruto: payload.grossAmount,
            vlrIR: payload.irAmount,
          },
        });
      } else {
        draft = buildReinfR1070Event({
          company: currentCompany,
          config,
          tpProc: 2,
          nrProc: payload.doc,
          iniValid: competence,
        });
      }

      await createReinfEventsBatch(currentTenantId, [draft]);
      await loadReinfData();
      setSubTab('queue');
      setFeedback({
        type: 'success',
        text: `Evento ${draft.eventCode} enfileirado na fila XML da competência ${competence}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao criar evento avulso.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 5. Transmissão Lote Assíncrono (Dev v2.8 /recepcao/lotes)
  const handleTransmitPendingBatch = async () => {
    const queue = events.filter(
      (e) => e.status === 'validated' || e.status === 'pending' || e.status === 'draft'
    );
    if (queue.length === 0) {
      setFeedback({
        type: 'error',
        text: 'Não há eventos validados pendentes para envio de lote assíncrono.',
      });
      return;
    }

    setBusyAction('transmit');
    setFeedback(null);
    try {
      const result = await transmitReinfEventsBatch(
        currentTenantId,
        queue.map((q) => q.id),
        events
      );
      await loadReinfData();
      setFeedback({
        type: 'success',
        text: `Lote Assíncrono ${result.protocol} processado: ${result.accepted} evento(s) aceito(s) na RFB e ${result.rejected} rejeitado(s).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao transmitir lote EFD-Reinf.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleExcludeWithR9000 = async (evt: ReinfEventRecord) => {
    if (!currentCompany) return;
    setBusyAction(`excl-${evt.id}`);
    try {
      const r9000 = buildReinfR9000Event({
        company: currentCompany,
        config,
        targetEvent: evt,
      });
      await markReinfEventExcluded(currentTenantId, evt.id, r9000);
      await loadReinfData();
      setFeedback({
        type: 'success',
        text: `Evento ${evt.event_code} marcado como excluído via R-9000.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha na exclusão R-9000.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteEvent = async (evt: ReinfEventRecord) => {
    setBusyAction(`del-${evt.id}`);
    try {
      await deleteReinfEvent(currentTenantId, evt.id);
      await loadReinfData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao remover rascunho.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveConfig = async () => {
    setBusyAction('save_config');
    setFeedback(null);
    try {
      const saved = await upsertReinfContributorConfig(currentTenantId, config);
      setConfig(saved);
      setFeedback({
        type: 'success',
        text: 'Configuração R-1000 da EFD-Reinf v2.1.2b salva com sucesso.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar parâmetros R-1000.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (seriesFilter !== 'all' && e.event_series !== seriesFilter) return false;
      if (e.event_series !== 'tabelas' && e.competence && e.competence !== competence) return false;
      return true;
    });
  }, [events, seriesFilter, competence]);

  const kpis = useMemo(() => {
    const active = filteredEvents.filter((e) => e.status !== 'excluded');
    const pendingSend = active.filter((e) => e.status === 'validated' || e.status === 'pending').length;
    const accepted = active.filter((e) => e.status === 'accepted').length;
    const totalRetFonte = active
      .filter((e) => e.event_series === 'r4000')
      .reduce((s, e) => s + Number(e.return_totals?.r9015_dctfweb_ret || 0), 0);
    const totalRetCp = active
      .filter((e) => e.event_series === 'r2000')
      .reduce(
        (s, e) =>
          s +
          Number(e.return_totals?.r9001_ret_cp || 0) +
          Number(e.return_totals?.r9001_cprb || 0),
        0
      );
    return {
      total: active.length,
      pendingSend,
      accepted,
      totalRetFonte,
      totalRetCp,
    };
  }, [filteredEvents]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <ModuleBanner
        badge={
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#f5a90e] text-[10px] font-bold">
              <ReceiptText className="w-3 h-3" />
              <span>SPED · EFD-Reinf {REINF_VERSION_LABEL}</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-semibold">
              {config.tp_amb === 1 ? 'Ambiente: 1 · Produção' : 'Ambiente: 2 · Produção Restrita'}
            </span>
          </>
        }
        title={`Escrituração Fiscal Digital · EFD-Reinf (${currentCompany?.name || 'Empresa'})`}
        subtitle="Geração, validação (Anexo II), transmissão em Lote Assíncrono (REST v2.8) e apuração DCTFWeb para as séries R-1000, R-2000 e R-4000."
        actions={
          <>
            <label className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>Competência:</span>
              <input
                type="month"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="bg-transparent text-white font-mono font-bold focus:outline-none [color-scheme:dark]"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadReinfData()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </>
        }
        bottomSlot={
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-300">
                Eventos na Fila ({competence})
              </p>
              <p className="text-lg font-extrabold leading-tight mt-0.5">{kpis.total}</p>
              <p className="text-[10px] text-slate-300">
                {kpis.accepted} aceitos · {kpis.pendingSend} pendentes
              </p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-300">Folha PJ Integrada</p>
              <p className="text-lg font-extrabold leading-tight mt-0.5 text-[#f5a90e]">
                {pjEntriesForCompetence.length} PJ(s)
              </p>
              <p className="text-[10px] text-slate-300">Prontos para evento R-4020</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-300">
                REINF RET · Série R-4000
              </p>
              <p className="text-lg font-extrabold leading-tight mt-0.5">
                {formatBRL(kpis.totalRetFonte)}
              </p>
              <p className="text-[10px] text-slate-300">IRRF + PCC consolidado R-9015</p>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-300">
                REINF CP · Série R-2000
              </p>
              <p className="text-lg font-extrabold leading-tight mt-0.5">
                {formatBRL(kpis.totalRetCp)}
              </p>
              <p className="text-[10px] text-slate-300">Retenção CP / CPRB R-9011</p>
            </div>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-navegação */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'queue', label: 'Fila de Lotes & Fechamentos', icon: Landmark },
          { id: 'manual', label: 'Lançamentos Avulsos (R-2000 / R-4000)', icon: FilePlus2 },
          { id: 'tables_totals', label: 'Tabelas 01/06 & Espelho DCTFWeb', icon: BookOpenCheck },
          { id: 'config', label: 'Cadastro Contribuinte R-1000', icon: Settings2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as ReinfSubTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#082175] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#f5a90e]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'queue' && (
        <div className="space-y-5">
          {/* Painel de Ações em Cadeia (Precedência Oficial Manual do Desenvolvedor 7.1) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-[#082175]">
                  Fluxo Oficial de Transmissão EFD-Reinf (Precedência 7.1 · Dev v2.8)
                </h2>
                <p className="text-xs text-slate-500">
                  1) Tabela R-1000 → 2) Periódicos R-4020/R-2010 → 3) Fechamentos R-4099/R-2099 → 4)
                  Envio Assíncrono.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTransmitPendingBatch}
                disabled={busyAction !== null || kpis.pendingSend === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'transmit' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Transmitir Lote Assíncrono ({kpis.pendingSend})</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateR1000}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#082175] cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#9F8548]" />
                <span>1. Gerar R-1000 Contribuinte</span>
              </button>

              <button
                type="button"
                onClick={handleSyncPjPayrollToR4020}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#082175]/20 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-[#082175] cursor-pointer"
              >
                <ReceiptText className="w-3.5 h-3.5 text-[#082175]" />
                <span>2. Importar Folha PJ → R-4020 ({pjEntriesForCompetence.length})</span>
              </button>

              <button
                type="button"
                onClick={() => void handleControlEvent('close_r4000')}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>3a. Fechar R-4000 (R-4099)</span>
              </button>

              <button
                type="button"
                onClick={() => void handleControlEvent('reopen_r4000')}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reabrir R-4000</span>
              </button>

              <button
                type="button"
                onClick={() => void handleControlEvent('close_r2000')}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-800 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>3b. Fechar R-2000 (R-2099)</span>
              </button>

              <button
                type="button"
                onClick={() => void handleControlEvent('reopen_r2000')}
                disabled={busyAction !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reabrir R-2000 (R-2098)</span>
              </button>
            </div>
          </div>

          {/* Filtro por Série + Tabela */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#082175]">
                <Filter className="w-4 h-4 text-[#9F8548]" />
                <span>Eventos Enfileirados ({filteredEvents.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'tabelas', label: 'R-1000 / R-1070' },
                  { id: 'r4000', label: 'Série R-4000 (IR/CSRF)' },
                  { id: 'r2000', label: 'Série R-2000 (CP/CPRB)' },
                  { id: 'controle', label: 'Fechamentos / R-9000' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSeriesFilter(f.id as 'all' | ReinfEventSeries)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      seriesFilter === f.id
                        ? 'bg-[#082175] text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#082175]" />
                <span>Carregando fila de eventos EFD-Reinf...</span>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700">
                  Nenhum evento EFD-Reinf na fila para {competence}
                </p>
                <p className="text-xs text-slate-500">
                  Gere o R-1000 Contribuinte, importe os lançamentos PJ da folha (R-4020) ou utilize
                  a aba de Lançamentos Avulsos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Evento / Série</th>
                      <th className="px-4 py-3">Beneficiário / Contraparte</th>
                      <th className="px-4 py-3">Comp. / natRend</th>
                      <th className="px-4 py-3 text-right">Tributos Apurados</th>
                      <th className="px-4 py-3">Status / Recibo RFB</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((evt) => {
                      const statusMeta = STATUS_META[evt.status] || STATUS_META.pending;
                      const retFonte = Number(evt.return_totals?.r9015_dctfweb_ret || 0);
                      const retCp =
                        Number(evt.return_totals?.r9001_ret_cp || 0) +
                        Number(evt.return_totals?.r9001_cprb || 0);
                      const tributoExibido = retFonte > 0 ? retFonte : retCp;

                      return (
                        <tr key={evt.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#082175] text-white font-mono font-bold text-[11px]">
                                {evt.event_code}
                              </span>
                              <span className="font-bold text-slate-800">{evt.event_name}</span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 mt-1">{evt.event_uid}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">
                              {evt.beneficiary_name || currentCompany?.name || 'Declarante'}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">
                              {evt.beneficiary_doc || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-700">
                            <p>{evt.competence || 'Tabela'}</p>
                            <p className="text-[10px] text-slate-500">
                              {evt.nat_rend ? `Cód. ${evt.nat_rend}` : '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                            {tributoExibido > 0 ? formatBRL(tributoExibido) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusMeta.className}`}
                            >
                              {statusMeta.label}
                            </span>
                            {evt.receipt_number && (
                              <p className="text-[10px] font-mono text-emerald-700 mt-1">
                                Recibo: {evt.receipt_number}
                              </p>
                            )}
                            {evt.validation_errors.length > 0 && (
                              <p className="text-[10px] text-red-600 mt-1 truncate max-w-xs">
                                {evt.validation_errors[0]}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectingEvent(evt)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-[#082175] cursor-pointer"
                              >
                                <Code2 className="w-3.5 h-3.5" />
                                <span>XML</span>
                              </button>
                              {evt.status === 'accepted' &&
                                ['R-2010', 'R-2020', 'R-2060', 'R-4010', 'R-4020', 'R-4040', 'R-4080'].includes(
                                  evt.event_code
                                ) && (
                                  <button
                                    type="button"
                                    onClick={() => void handleExcludeWithR9000(evt)}
                                    disabled={busyAction !== null}
                                    className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-[11px] font-bold text-amber-800 cursor-pointer"
                                  >
                                    R-9000
                                  </button>
                                )}
                              {evt.status !== 'accepted' && evt.status !== 'excluded' && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteEvent(evt)}
                                  disabled={busyAction !== null}
                                  className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Remover da fila"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'manual' && (
        <ReinfManualEventsTab
          competence={competence}
          busyAction={busyAction}
          onGenerateManualEvent={handleGenerateManualEvent}
        />
      )}

      {subTab === 'tables_totals' && (
        <ReinfTablesTotalsTab competence={competence} events={events} />
      )}

      {subTab === 'config' && (
        <ReinfContributorConfigTab
          config={config}
          setConfig={setConfig}
          busyAction={busyAction}
          onSaveConfig={handleSaveConfig}
        />
      )}

      <ReinfEventInspectorModal event={inspectingEvent} onClose={() => setInspectingEvent(null)} />
    </div>
  );
};
