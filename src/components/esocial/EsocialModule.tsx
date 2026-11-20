import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCcb } from '../../context/CcbContext';
import type {
  EsocialEmployerConfig,
  EsocialEventCategory,
  EsocialEventRecord,
} from '../../types/database';
import {
  buildDefaultEsocialEmployerConfig,
  buildEsocialS1000Event,
  buildEsocialS1005Event,
  buildEsocialS1010Event,
  buildEsocialS1020Event,
  buildEsocialS1200Event,
  buildEsocialS1210Event,
  buildEsocialS1298Event,
  buildEsocialS1299Event,
  buildEsocialS2200Event,
  buildEsocialS2206Event,
  buildEsocialS2230Event,
  buildEsocialS2299Event,
  buildEsocialS3000Event,
  ESOCIAL_S13_VERSION_LABEL,
  ESOCIAL_STANDARD_RUBRICAS_S1010,
  type BuiltEsocialEventDraft,
} from '../../utils/esocial/esocialS13Engine';
import {
  createEsocialEventsBatch,
  deleteEsocialEvent,
  fetchEsocialEmployerConfig,
  fetchEsocialEvents,
  markEsocialEventExcluded,
  transmitEsocialEventsBatch,
  upsertEsocialEmployerConfig,
} from '../../services/esocialService';
import { EsocialEventInspectorModal } from './EsocialEventInspectorModal';
import {
  EsocialNonPeriodicTab,
  type NonPeriodicIndividualInput,
} from './EsocialNonPeriodicTab';
import { EsocialRubricasCatalogTab } from './EsocialRubricasCatalogTab';
import { EsocialEmployerConfigTab } from './EsocialEmployerConfigTab';
import { ModuleBanner } from '../ui/ModuleBanner';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Code2,
  FileCode2,
  FileSpreadsheet,
  Filter,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Settings2,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react';

type EsocialSubTab = 'queue' | 'non_periodic' | 'rubricas_totals' | 'config';

const formatBRL = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const getCurrentCompetence = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const STATUS_META: Record<EsocialEventRecord['status'], { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  pending: { label: 'Pendente', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  validated: {
    label: 'Validado S-1.3',
    className: 'bg-sky-50 text-[#082175] border-sky-200',
  },
  transmitted: {
    label: 'Em Processamento',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  accepted: {
    label: 'Aceito no RET',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  rejected: {
    label: 'Crítica Anexo II',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  excluded: {
    label: 'Excluído (S-3000)',
    className: 'bg-slate-100 text-slate-500 border-slate-200 line-through',
  },
};

export const EsocialModule: React.FC = () => {
  const {
    currentTenantId,
    currentCompany,
    employees,
    jobs,
    payrollEntries,
    employeeVacations,
    currentPayrollParameters,
  } = useCcb();

  const [subTab, setSubTab] = useState<EsocialSubTab>('queue');
  const [competence, setCompetence] = useState<string>(getCurrentCompetence());
  const [categoryFilter, setCategoryFilter] = useState<'all' | EsocialEventCategory>('all');
  const [config, setConfig] = useState<EsocialEmployerConfig>(() =>
    buildDefaultEsocialEmployerConfig(currentTenantId)
  );
  const [events, setEvents] = useState<EsocialEventRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [inspectingEvent, setInspectingEvent] = useState<EsocialEventRecord | null>(null);

  const cltEmployees = useMemo(
    () => employees.filter((e) => (e.contract_type || 'clt') === 'clt'),
    [employees]
  );
  const pjEmployeesCount = useMemo(
    () => employees.filter((e) => e.contract_type === 'pj').length,
    [employees]
  );

  const loadEsocialData = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const [cfg, evts] = await Promise.all([
        fetchEsocialEmployerConfig(currentTenantId),
        fetchEsocialEvents(currentTenantId),
      ]);
      setConfig(cfg);
      setEvents(evts);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao carregar dados do eSocial.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentTenantId]);

  useEffect(() => {
    void loadEsocialData();
  }, [loadEsocialData]);

  // 1ª Etapa: Tabelas S-1000, S-1005, S-1010, S-1020
  const handleGenerateTableEvents = async () => {
    setBusyAction('tables');
    setFeedback(null);
    try {
      const existingCodes = new Set(
        events
          .filter((e) => e.event_category === 'tabelas' && e.status !== 'excluded')
          .map((e) => `${e.event_code}:${e.payload_summary?.codRubr || ''}`)
      );

      const drafts: BuiltEsocialEventDraft[] = [];
      let seq = events.length + 1;

      if (!existingCodes.has('S-1000:')) {
        drafts.push(
          buildEsocialS1000Event({ company: currentCompany, config, iniValid: competence, sequence: seq++ })
        );
      }
      if (!existingCodes.has('S-1005:')) {
        drafts.push(
          buildEsocialS1005Event({ company: currentCompany, config, iniValid: competence, sequence: seq++ })
        );
      }
      if (!existingCodes.has('S-1020:')) {
        drafts.push(
          buildEsocialS1020Event({ company: currentCompany, config, iniValid: competence, sequence: seq++ })
        );
      }

      for (const rub of ESOCIAL_STANDARD_RUBRICAS_S1010) {
        if (!existingCodes.has(`S-1010:${rub.codRubr}`)) {
          drafts.push(
            buildEsocialS1010Event({
              company: currentCompany,
              config,
              rubrica: rub,
              iniValid: competence,
              sequence: seq++,
            })
          );
        }
      }

      if (drafts.length === 0) {
        setFeedback({
          type: 'success',
          text: 'Todos os eventos de Tabela Iniciais (S-1000, S-1005, S-1010 e S-1020) já estão gerados na fila.',
        });
      } else {
        await createEsocialEventsBatch(currentTenantId, drafts);
        await loadEsocialData();
        setFeedback({
          type: 'success',
          text: `${drafts.length} evento(s) de Tabela (S-1000, S-1005, S-1010 e S-1020) gerados com leiaute S-1.3!`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao gerar eventos de tabela.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 2ª Etapa: Vínculos CLT (S-2200), Férias Aprovadas (S-2230) e Desligamentos (S-2299)
  const handleSyncNonPeriodicFromHr = async () => {
    setBusyAction('non_periodic');
    setFeedback(null);
    try {
      const drafts: BuiltEsocialEventDraft[] = [];
      let seq = events.length + 1;

      const existingS2200EmpIds = new Set(
        events
          .filter((e) => e.event_code === 'S-2200' && e.status !== 'excluded')
          .map((e) => e.employee_id)
      );

      for (const emp of cltEmployees) {
        if (!existingS2200EmpIds.has(emp.id)) {
          const job = jobs.find((j) => j.id === emp.job_id);
          drafts.push(
            buildEsocialS2200Event({ company: currentCompany, config, employee: emp, job, sequence: seq++ })
          );
        }
      }

      const existingVacIds = new Set(
        events
          .filter((e) => e.event_code === 'S-2230' && e.status !== 'excluded' && e.vacation_id)
          .map((e) => e.vacation_id)
      );

      const approvedVacations = employeeVacations.filter(
        (v) =>
          (v.status === 'approved' ||
            v.status === 'scheduled' ||
            v.status === 'in_progress' ||
            v.status === 'completed') &&
          !existingVacIds.has(v.id)
      );

      for (const vac of approvedVacations) {
        const emp = cltEmployees.find((e) => e.id === vac.employee_id);
        if (!emp) continue;
        drafts.push(
          buildEsocialS2230Event({
            company: currentCompany,
            config,
            employee: emp,
            codMotAfast: '15',
            dtIniAfast: vac.start_date,
            dtTermAfast: vac.end_date,
            perAquisStart: vac.acquisitive_start,
            perAquisEnd: vac.acquisitive_end,
            vacation: vac,
            sequence: seq++,
          })
        );
      }

      const existingS2299EmpIds = new Set(
        events
          .filter((e) => e.event_code === 'S-2299' && e.status !== 'excluded')
          .map((e) => e.employee_id)
      );
      for (const emp of cltEmployees) {
        if (emp.resignation_date && !existingS2299EmpIds.has(emp.id)) {
          drafts.push(
            buildEsocialS2299Event({
              company: currentCompany,
              config,
              employee: emp,
              dtDeslig: emp.resignation_date,
              mtvDeslig: '02',
              sequence: seq++,
            })
          );
        }
      }

      if (drafts.length === 0) {
        setFeedback({
          type: 'success',
          text: 'Todos os vínculos CLT (S-2200), férias aprovadas (S-2230) e desligamentos (S-2299) já estão sincronizados.',
        });
      } else {
        await createEsocialEventsBatch(currentTenantId, drafts);
        await loadEsocialData();
        setFeedback({
          type: 'success',
          text: `${drafts.length} evento(s) Não Periódico(s) (S-2200 / S-2230 / S-2299) sincronizados!`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao sincronizar eventos não periódicos.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 3ª Etapa: Folha S-1200 + Pagamentos S-1210
  const handleGeneratePeriodicPayrollEvents = async () => {
    setBusyAction('periodic');
    setFeedback(null);
    try {
      const compEntries = payrollEntries.filter(
        (p) => p.competence === competence && (p.contract_type || 'clt') === 'clt'
      );
      if (compEntries.length === 0) {
        setFeedback({
          type: 'error',
          text: `Não há lançamentos CLT na Folha para ${competence}. Gere a competência no módulo Folha primeiro.`,
        });
        return;
      }

      const existingS1200Emp = new Set(
        events
          .filter((e) => e.event_code === 'S-1200' && e.competence === competence && e.status !== 'excluded')
          .map((e) => e.employee_id)
      );
      const existingS1210Emp = new Set(
        events
          .filter((e) => e.event_code === 'S-1210' && e.competence === competence && e.status !== 'excluded')
          .map((e) => e.employee_id)
      );

      const drafts: BuiltEsocialEventDraft[] = [];
      let seq = events.length + 1;

      for (const entry of compEntries) {
        const emp = employees.find((e) => e.id === entry.employee_id);
        if (!emp) continue;

        if (!existingS1200Emp.has(emp.id)) {
          drafts.push(
            buildEsocialS1200Event({ company: currentCompany, config, employee: emp, entry, sequence: seq++ })
          );
        }
        if (!existingS1210Emp.has(emp.id)) {
          drafts.push(
            buildEsocialS1210Event({
              company: currentCompany,
              config,
              employee: emp,
              entry,
              payrollParameters: currentPayrollParameters,
              sequence: seq++,
            })
          );
        }
      }

      if (drafts.length === 0) {
        setFeedback({
          type: 'success',
          text: `Os eventos S-1200 e S-1210 de ${competence} já foram gerados para todos os colaboradores da folha.`,
        });
      } else {
        await createEsocialEventsBatch(currentTenantId, drafts);
        await loadEsocialData();
        setFeedback({
          type: 'success',
          text: `${drafts.length} evento(s) periódico(s) (S-1200 + S-1210) gerados com apuração S-5001/S-5002/S-5003!`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao gerar eventos periódicos.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // 4ª Etapa: Fechamento S-1299 / Reabertura S-1298
  const handleCloseCompetenceS1299 = async () => {
    setBusyAction('s1299');
    setFeedback(null);
    try {
      const compEntries = payrollEntries.filter((p) => p.competence === competence);
      const s1200Count = events.filter(
        (e) => e.event_code === 'S-1200' && e.competence === competence && e.status !== 'excluded'
      ).length;
      const s1210Count = events.filter(
        (e) => e.event_code === 'S-1210' && e.competence === competence && e.status !== 'excluded'
      ).length;

      const draft = buildEsocialS1299Event({
        company: currentCompany,
        config,
        competence,
        entriesForCompetence: compEntries,
        activeCltEmployeesCount: cltEmployees.filter((e) => e.status === 'active').length,
        s1200Count,
        s1210Count,
        sequence: events.length + 1,
      });

      await createEsocialEventsBatch(currentTenantId, [draft]);
      await loadEsocialData();
      setFeedback({
        type: 'success',
        text: `Evento S-1299 (Fechamento de ${competence}) gerado com transmissão à DCTFWeb e FGTS Digital!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao gerar fechamento S-1299.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleReopenCompetenceS1298 = async () => {
    setBusyAction('s1298');
    setFeedback(null);
    try {
      const draft = buildEsocialS1298Event({
        company: currentCompany,
        config,
        competence,
        sequence: events.length + 1,
      });
      await createEsocialEventsBatch(currentTenantId, [draft]);
      await loadEsocialData();
      setFeedback({
        type: 'success',
        text: `Evento S-1298 (Reabertura de ${competence}) gerado na fila.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao reabrir competência S-1298.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleTransmitPendingBatch = async () => {
    const readyToTransmit = events.filter(
      (e) => e.status === 'validated' || e.status === 'pending'
    );
    if (readyToTransmit.length === 0) return;

    setBusyAction('transmit');
    setFeedback(null);
    try {
      const { accepted, rejected } = await transmitEsocialEventsBatch(
        currentTenantId,
        readyToTransmit.map((e) => e.id),
        events
      );
      await loadEsocialData();
      setFeedback({
        type: rejected > 0 && accepted === 0 ? 'error' : 'success',
        text: `Lote S-1.3 processado pelo RET: ${accepted} aceito(s) com recibo (nrRecibo) e ${rejected} com crítica do Anexo II.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao transmitir lote ao eSocial.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateIndividualNonPeriodic = async (input: NonPeriodicIndividualInput) => {
    const emp = cltEmployees.find((e) => e.id === input.employeeId);
    if (!emp) return;
    const job = jobs.find((j) => j.id === emp.job_id);

    setBusyAction(input.mode);
    setFeedback(null);
    try {
      let draft: BuiltEsocialEventDraft;
      const seq = events.length + 1;

      if (input.mode === 'S-2200') {
        draft = buildEsocialS2200Event({ company: currentCompany, config, employee: emp, job, sequence: seq });
      } else if (input.mode === 'S-2206') {
        draft = buildEsocialS2206Event({
          company: currentCompany,
          config,
          employee: emp,
          job,
          dtAlteracao: input.altDate,
          newSalary: input.altSalaryValue,
          description: input.altReason,
          sequence: seq,
        });
      } else if (input.mode === 'S-2230') {
        draft = buildEsocialS2230Event({
          company: currentCompany,
          config,
          employee: emp,
          codMotAfast: input.afastMotivo,
          dtIniAfast: input.afastStart,
          dtTermAfast: input.afastEnd,
          sequence: seq,
        });
      } else {
        draft = buildEsocialS2299Event({
          company: currentCompany,
          config,
          employee: emp,
          mtvDeslig: input.desligMotivo,
          dtDeslig: input.desligDate,
          sequence: seq,
        });
      }

      await createEsocialEventsBatch(currentTenantId, [draft]);
      await loadEsocialData();
      setSubTab('queue');
      setFeedback({
        type: 'success',
        text: `Evento ${input.mode} gerado para ${emp.full_name} com XML S-1.3 validado!`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : `Erro ao gerar evento ${input.mode}.`,
      });
    } finally {
      setBusyAction(null);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (categoryFilter !== 'all' && evt.event_category !== categoryFilter) return false;
      return true;
    });
  }, [events, categoryFilter]);

  const kpis = useMemo(() => {
    const activeEvents = events.filter((e) => e.status !== 'excluded');
    const acceptedCount = activeEvents.filter((e) => e.status === 'accepted').length;
    const pendingCount = activeEvents.filter(
      (e) => e.status === 'validated' || e.status === 'pending'
    ).length;
    const rejectedCount = activeEvents.filter((e) => e.status === 'rejected').length;

    const compCltEntries = payrollEntries.filter(
      (p) => p.competence === competence && (p.contract_type || 'clt') === 'clt'
    );
    const s5001InssSegurados = compCltEntries.reduce((s, e) => s + Number(e.inss_amount || 0), 0);
    const s5011InssPatronal = compCltEntries.reduce(
      (s, e) => s + Number(e.inss_patronal_amount || 0),
      0
    );
    const s5002Irrf = compCltEntries.reduce((s, e) => s + Number(e.irrf_amount || 0), 0);
    const s5003Fgts = compCltEntries.reduce((s, e) => s + Number(e.fgts_amount || 0), 0);

    return {
      total: activeEvents.length,
      acceptedCount,
      pendingCount,
      rejectedCount,
      s5001InssSegurados,
      s5011InssPatronal,
      s5002Irrf,
      s5003Fgts,
    };
  }, [events, payrollEntries, competence]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {feedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Principal eSocial S-1.3 */}
      <ModuleBanner
        badge={
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[#f5a90e] text-[10px] font-bold font-mono">
              <FileCode2 className="w-3 h-3" />
              <span>eSocial {ESOCIAL_S13_VERSION_LABEL}</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                config.tp_amb === 1
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-amber-400/20 text-amber-200'
              }`}
            >
              tpAmb = {config.tp_amb} ({config.tp_amb === 1 ? 'Produção' : 'Produção Restrita'})
            </span>
          </>
        }
        title="Central de Transmissão & Conformidade eSocial"
        subtitle={
          <>
            Geração e validação Anexo II para <strong className="text-white">{currentCompany?.name || 'Empresa'}</strong>{' '}
            (Classif. Tributária <strong className="text-white">{config.class_trib}</strong> · FPAS{' '}
            <strong className="text-white">{config.fpas}</strong> · DCTFWeb & FGTS Digital integrados).
          </>
        }
        actions={
          <>
            <label className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-[#f5a90e]" />
              <span>Período:</span>
              <input
                type="month"
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="bg-transparent font-mono font-bold text-white outline-none [color-scheme:dark]"
              />
            </label>

            <button
              type="button"
              disabled={busyAction !== null || kpis.pendingCount === 0}
              onClick={() => void handleTransmitPendingBatch()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f5a90e] hover:bg-[#e59b05] text-[#082175] font-extrabold text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {busyAction === 'transmit' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Transmitir Lote ao RET ({kpis.pendingCount})</span>
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Fila de Eventos S-1.3
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-[#082175] font-mono">{kpis.total}</span>
            <span className="text-xs font-semibold text-emerald-700">
              {kpis.acceptedCount} aceito(s) no RET
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {kpis.pendingCount} pronto(s) p/ envio · {kpis.rejectedCount} com crítica Anexo II
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            S-5001 / S-5011 · Previdência (DCTFWeb)
          </span>
          <div className="text-xl font-extrabold text-[#082175] font-mono">
            {formatBRL(kpis.s5001InssSegurados + kpis.s5011InssPatronal)}
          </div>
          <p className="text-[11px] text-slate-500">
            Segurados: {formatBRL(kpis.s5001InssSegurados)} · Patronal:{' '}
            {formatBRL(kpis.s5011InssPatronal)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            S-5002 / S-5012 · IRRF (CR 056107)
          </span>
          <div className="text-xl font-extrabold text-emerald-700 font-mono">
            {formatBRL(kpis.s5002Irrf)}
          </div>
          <p className="text-[11px] text-slate-500">
            {currentPayrollParameters.apply_lei_15270
              ? 'Lei nº 15.270/2025 (Isenção até R$ 5 mil ativa)'
              : 'Tabela Progressiva Padrão'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            S-5003 / S-5013 · FGTS Digital (8%)
          </span>
          <div className="text-xl font-extrabold text-[#082175] font-mono">
            {formatBRL(kpis.s5003Fgts)}
          </div>
          <p className="text-[11px] text-slate-500">
            Base vinculada aos eventos S-1200 de {competence}
          </p>
        </div>
      </div>

      {/* Sub-Abas */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap items-center gap-1.5 text-xs">
        {(
          [
            { id: 'queue', label: '1. Fila & Automação de Eventos (S-1000 a S-1299)', icon: Layers },
            {
              id: 'non_periodic',
              label: '2. Contratação, Salário, Férias & Rescisão (S-2200 a S-2299)',
              icon: UserPlus,
            },
            {
              id: 'rubricas_totals',
              label: '3. Rubricas S-1010 (Tabelas 03 e 21) & Retornos S-5000',
              icon: FileSpreadsheet,
            },
            {
              id: 'config',
              label: '4. Parâmetros do Empregador (S-1000 / S-1005 / S-1020)',
              icon: Settings2,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#082175] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#082175]'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-[#f5a90e]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-ABA 1: FILA & AUTOMAÇÃO */}
      {subTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-[#082175]">
                Pipeline Oficial de Geração de Eventos (Ordem Cronológica do RET)
              </h2>
              <p className="text-[11px] text-slate-500">
                Sequência exigida pelo eSocial: 1º Tabelas → 2º Vínculos e Não Periódicos → 3º
                Remuneração e Pagamentos → 4º Fechamento DCTFWeb.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleGenerateTableEvents()}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#082175] bg-slate-50/70 hover:bg-white text-left transition-all cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#082175]/10 text-[#082175] font-mono font-bold text-[10px]">
                    1ª Etapa · Tabelas
                  </span>
                  {busyAction === 'tables' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#082175]" />
                  ) : (
                    <Building2 className="w-4 h-4 text-[#9F8548]" />
                  )}
                </div>
                <p className="text-xs font-bold text-[#082175]">
                  Gerar S-1000, S-1005, S-1010 e S-1020
                </p>
                <p className="text-[11px] text-slate-500">
                  Empregador, Matriz, {ESOCIAL_STANDARD_RUBRICAS_S1010.length} Rubricas e Lotação.
                </p>
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleSyncNonPeriodicFromHr()}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#082175] bg-slate-50/70 hover:bg-white text-left transition-all cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#082175]/10 text-[#082175] font-mono font-bold text-[10px]">
                    2ª Etapa · Vínculos & Férias
                  </span>
                  {busyAction === 'non_periodic' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#082175]" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-[#9F8548]" />
                  )}
                </div>
                <p className="text-xs font-bold text-[#082175]">
                  Sincronizar S-2200, S-2230 e S-2299
                </p>
                <p className="text-[11px] text-slate-500">
                  Admissões CLT ({cltEmployees.length}), Férias aprovadas e Rescisões.
                </p>
              </button>

              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => void handleGeneratePeriodicPayrollEvents()}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-[#082175] bg-slate-50/70 hover:bg-white text-left transition-all cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#082175]/10 text-[#082175] font-mono font-bold text-[10px]">
                    3ª Etapa · Folha ({competence})
                  </span>
                  {busyAction === 'periodic' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#082175]" />
                  ) : (
                    <FileCode2 className="w-4 h-4 text-[#9F8548]" />
                  )}
                </div>
                <p className="text-xs font-bold text-[#082175]">
                  Gerar S-1200 (RGPS) e S-1210 (IRRF)
                </p>
                <p className="text-[11px] text-slate-500">
                  Converte a folha de {competence} em demonstrativos dmDev e pagamentos CR 056107.
                </p>
              </button>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-bold text-[10px]">
                    4ª Etapa · Fechamento
                  </span>
                  <p className="text-xs font-bold text-[#082175] mt-1">
                    Fechar (S-1299) ou Reabrir (S-1298)
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void handleCloseCompetenceS1299()}
                    className="flex-1 min-h-[34px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white text-[11px] font-bold cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-[#f5a90e]" />
                    <span>S-1299</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => void handleReopenCompetenceS1298()}
                    className="min-h-[34px] inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>S-1298</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                {(
                  [
                    { id: 'all', label: `Todos (${events.length})` },
                    {
                      id: 'tabelas',
                      label: `Tabelas S-1000..S-1020 (${
                        events.filter((e) => e.event_category === 'tabelas').length
                      })`,
                    },
                    {
                      id: 'nao_periodicos',
                      label: `Não Periódicos S-2200..S-2299 (${
                        events.filter((e) => e.event_category === 'nao_periodicos').length
                      })`,
                    },
                    {
                      id: 'periodicos',
                      label: `Periódicos S-1200..S-1299 (${
                        events.filter((e) => e.event_category === 'periodicos').length
                      })`,
                    },
                    {
                      id: 'controle',
                      label: `Exclusões S-3000 (${
                        events.filter((e) => e.event_category === 'controle').length
                      })`,
                    },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setCategoryFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      categoryFilter === pill.id
                        ? 'bg-[#082175] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void loadEsocialData()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#082175] hover:underline cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar Fila</span>
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center space-y-2 text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#082175]" />
                <p className="text-xs font-medium">Carregando fila de eventos eSocial S-1.3...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileCode2 className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">
                  Nenhum evento eSocial na fila para este filtro
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Utilize os botões do pipeline acima para gerar automaticamente os XMLs oficiais na
                  versão S-1.3.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Evento & Identificador</th>
                      <th className="py-3 px-3 text-left font-semibold">Trabalhador / Escopo</th>
                      <th className="py-3 px-3 text-center font-semibold">Período</th>
                      <th className="py-3 px-3 text-center font-semibold">Status RET</th>
                      <th className="py-3 px-3 text-left font-semibold">Recibo / Retornos S-5000</th>
                      <th className="py-3 px-4 text-right font-semibold">XML & Auditoria</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((evt) => {
                      const st = STATUS_META[evt.status] || STATUS_META.pending;
                      const emp = employees.find((e) => e.id === evt.employee_id);
                      return (
                        <tr key={evt.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#082175] text-white font-mono font-bold text-[11px]">
                                {evt.event_code}
                              </span>
                              <span className="font-bold text-slate-800">{evt.event_name}</span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {evt.event_uid}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800 block">
                              {emp?.full_name ||
                                String(
                                  evt.payload_summary?.trabalhador ||
                                    evt.payload_summary?.beneficiario ||
                                    evt.payload_summary?.dscRubr ||
                                    currentCompany?.name ||
                                    'Empregador'
                                )}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {evt.payload_summary?.matricula
                                ? `Matrícula: ${evt.payload_summary.matricula}`
                                : evt.payload_summary?.codRubr
                                ? `Rubrica: ${evt.payload_summary.codRubr} (Nat. ${evt.payload_summary.natRubr})`
                                : `Ambiente tpAmb=${evt.tp_amb}`}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">
                            {evt.competence || '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.className}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {evt.receipt_number ? (
                              <span className="font-mono text-[11px] font-bold text-emerald-800 block">
                                Recibo: {evt.receipt_number}
                              </span>
                            ) : evt.validation_errors.length > 0 ? (
                              <span className="text-[11px] text-red-700 font-semibold block">
                                {evt.validation_errors[0]}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 block">
                                Pronto para transmissão
                              </span>
                            )}
                            {evt.return_totals && (
                              <span className="text-[10px] font-mono text-slate-500">
                                {typeof evt.return_totals.s5001_inss_segurado === 'number'
                                  ? `S-5001 INSS: ${formatBRL(evt.return_totals.s5001_inss_segurado)} `
                                  : ''}
                                {typeof evt.return_totals.s5002_irrf_retido === 'number'
                                  ? `· S-5002 IRRF: ${formatBRL(evt.return_totals.s5002_irrf_retido)}`
                                  : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectingEvent(evt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#082175] font-bold text-[11px] cursor-pointer"
                            >
                              <Code2 className="w-3.5 h-3.5 text-[#9F8548]" />
                              <span>XML S-1.3</span>
                            </button>
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

      {/* SUB-ABA 2: CONTRATAÇÃO, SALÁRIO, FÉRIAS & RESCISÃO */}
      {subTab === 'non_periodic' && (
        <EsocialNonPeriodicTab
          cltEmployees={cltEmployees}
          pjEmployeesCount={pjEmployeesCount}
          jobs={jobs}
          busyAction={busyAction}
          onEmitIndividual={handleCreateIndividualNonPeriodic}
        />
      )}

      {/* SUB-ABA 3: RUBRICAS S-1010 & TABELAS 03/21 */}
      {subTab === 'rubricas_totals' && <EsocialRubricasCatalogTab />}

      {/* SUB-ABA 4: PARÂMETROS DO EMPREGADOR */}
      {subTab === 'config' && (
        <EsocialEmployerConfigTab
          config={config}
          setConfig={setConfig}
          saving={busyAction === 'save_cfg'}
          onSave={async () => {
            setBusyAction('save_cfg');
            try {
              const saved = await upsertEsocialEmployerConfig(currentTenantId, config);
              setConfig(saved);
              setFeedback({
                type: 'success',
                text: 'Parâmetros do empregador (S-1000 / S-1005 / S-1020) salvos com sucesso!',
              });
            } catch (err) {
              setFeedback({
                type: 'error',
                text: err instanceof Error ? err.message : 'Erro ao salvar configuração.',
              });
            } finally {
              setBusyAction(null);
            }
          }}
        />
      )}

      {/* Inspetor de XML S-1.3 */}
      <EsocialEventInspectorModal
        event={inspectingEvent}
        onClose={() => setInspectingEvent(null)}
        onExcludeWithS3000={async (evt) => {
          if (!evt.receipt_number) return;
          const emp = employees.find((e) => e.id === evt.employee_id);
          const s3000Draft = buildEsocialS3000Event({
            company: currentCompany,
            config,
            tpEventoExcluido: evt.event_code,
            nrRecEvt: evt.receipt_number,
            cpfTrab: emp?.cpf || null,
            perApur: evt.competence || null,
            sequence: events.length + 1,
          });
          await markEsocialEventExcluded(currentTenantId, evt.id, s3000Draft);
          setInspectingEvent(null);
          await loadEsocialData();
          setFeedback({
            type: 'success',
            text: `Evento S-3000 gerado para exclusão do recibo ${evt.receipt_number} (${evt.event_code}).`,
          });
        }}
        onDeleteDraft={async (evt) => {
          await deleteEsocialEvent(currentTenantId, evt.id);
          setInspectingEvent(null);
          await loadEsocialData();
          setFeedback({
            type: 'success',
            text: 'Evento removido da fila.',
          });
        }}
      />
    </div>
  );
};
