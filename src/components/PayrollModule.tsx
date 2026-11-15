import React, { useState, useMemo } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  EmployeeContractType,
  PayrollEntry,
  PayrollStatus,
} from '../types/database';
import { exportPayrollToExcel } from '../utils/payrollExport';
import { analyzeEmployeeVacationCycles } from '../utils/payrollCalculator';
import { PayrollSummaryKpis } from './payroll/PayrollSummaryKpis';
import { PayrollSettingsModal } from './payroll/PayrollSettingsModal';
import { PayrollEntryModal } from './payroll/PayrollEntryModal';
import { PayslipPreviewModal } from './payroll/PayslipPreviewModal';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getCurrentCompetence = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatDateBR = (iso?: string | null) => {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const STATUS_BADGE: Record<PayrollStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  closed: { label: 'Fechada', className: 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]' },
  paid: { label: 'Paga', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

const NFSE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  awaiting_issue: { label: 'Aguardando NFS-e', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  issued: { label: 'NFS-e Emitida', className: 'bg-purple-50 text-purple-800 border-purple-200' },
  approved: { label: 'Conferida', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  not_applicable: { label: 'Dispensada', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const PayrollModule: React.FC = () => {
  const {
    currentTenantId,
    currentCompany,
    employees,
    jobs,
    payrollEntries,
    currentPayrollParameters,
    savePayrollParameters,
    generateCompetencePayroll,
    syncDraftPayroll,
    upsertPayrollEntry,
    updatePayrollStatus,
    deletePayrollEntry,
  } = useCcb();

  const [competence, setCompetence] = useState<string>(getCurrentCompetence());
  const [regimeFilter, setRegimeFilter] = useState<'all' | EmployeeContractType>('all');
  const [generating, setGenerating] = useState(false);
  const [syncingDrafts, setSyncingDrafts] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [payslipEntry, setPayslipEntry] = useState<PayrollEntry | null>(null);

  const entriesForCompetence = useMemo(() => {
    return payrollEntries
      .filter((p) => p.competence === competence)
      .filter((p) => {
        if (regimeFilter === 'all') return true;
        const emp = employees.find((e) => e.id === p.employee_id);
        return (p.contract_type || emp?.contract_type || 'clt') === regimeFilter;
      });
  }, [payrollEntries, competence, regimeFilter, employees]);

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const { generated, skippedByDates } = await generateCompetencePayroll(competence);
      if (generated === 0 && skippedByDates > 0) {
        setFeedback({
          type: 'error',
          text: `${skippedByDates} cadastro(s) fora do período de vigência da competência ${competence}.`,
        });
      } else if (generated === 0) {
        setFeedback({
          type: 'success',
          text: `Todos os colaboradores elegíveis CLT e PJ já estão lançados em ${competence}.`,
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Competência ${competence} gerada para ${generated} colaborador(es) e Recibos vinculados automaticamente ao perfil individual de cada colaborador.${
            skippedByDates > 0 ? ` (${skippedByDates} ignorado(s) por admissão/rescisão)` : ''
          }`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao gerar folha.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const draftCountForCompetence = useMemo(
    () =>
      payrollEntries.filter((p) => p.competence === competence && p.status === 'draft').length,
    [payrollEntries, competence]
  );

  const handleSyncDrafts = async () => {
    setSyncingDrafts(true);
    setFeedback(null);
    try {
      const updated = await syncDraftPayroll(competence);
      setFeedback({
        type: 'success',
        text:
          updated > 0
            ? `${updated} lançamento(s) em rascunho de ${competence} recalculado(s) com o cadastro atual e parâmetros vigentes.`
            : `Não há lançamentos em rascunho na competência ${competence} para recalcular.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao sincronizar rascunhos.',
      });
    } finally {
      setSyncingDrafts(false);
    }
  };

  const handleExportExcel = () => {
    if (entriesForCompetence.length === 0) {
      setFeedback({
        type: 'error',
        text: `Não há lançamentos em ${competence} para exportar.`,
      });
      return;
    }
    exportPayrollToExcel({
      company: currentCompany,
      competence,
      entries: entriesForCompetence,
      employees,
      jobs,
    });
    setFeedback({
      type: 'success',
      text: `Planilha Excel (.xlsx) da competência ${competence} gerada com abas PF (CLT) e PJ (NFS-e).`,
    });
  };

  const handleDeleteEntry = async (entry: PayrollEntry) => {
    const emp = employees.find((e) => e.id === entry.employee_id);
    if (!window.confirm(`Remover lançamento de "${emp?.full_name || 'registro'}" em ${competence}?`))
      return;
    try {
      await deletePayrollEntry(entry.id);
      setFeedback({ type: 'success', text: 'Lançamento removido da competência.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao remover lançamento.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {feedback && (
        <div
          className={`flex items-center justify-between px-4 py-3 rounded-lg text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#9F8548] tracking-wide">
            Departamento Pessoal · PF (CLT + Lei 15.270/2025) & PJ (NFS-e)
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#082175] tracking-tight mt-1">
            Folha de Pagamento & Fechamento PJ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Regras trabalhistas e fiscais centralizadas para{' '}
            <strong>{currentCompany?.name || 'Empresa'}</strong>. Isenção de IRRF até R$ 5.000,00 ativa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#082175]" />
            <span className="text-slate-500 font-medium">Competência:</span>
            <input
              type="month"
              value={competence}
              onChange={(e) => setCompetence(e.target.value)}
              className="bg-transparent font-bold text-[#082175] outline-none"
            />
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#082175]/30 bg-[#E0F4F7]/50 hover:bg-[#E0F4F7] text-[#082175] font-semibold text-xs transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Parâmetros PF & PJ</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={entriesForCompetence.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleGeneratePayroll}
            disabled={generating || employees.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-[#f5a90e]" />
            )}
            <span>{generating ? 'Calculando...' : 'Gerar Competência'}</span>
          </button>

          {draftCountForCompetence > 0 && (
            <button
              onClick={handleSyncDrafts}
              disabled={syncingDrafts}
              title="Recalcula os lançamentos em rascunho conforme o regime atual (CLT/PJ) e parâmetros vigentes"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingDrafts ? 'animate-spin' : ''}`} />
              <span>{syncingDrafts ? 'Sincronizando...' : 'Recalcular Rascunhos'}</span>
            </button>
          )}

          <button
            onClick={() => setEditingEmployeeId(employees[0]?.id || '')}
            disabled={employees.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-[#082175] font-semibold text-xs transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lançar Individual</span>
          </button>
        </div>
      </div>

      {/* Resumo de Parâmetros Ativos & Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#082175]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              PF: Mín. {formatBRL(currentPayrollParameters.minimum_wage)} · Patronal{' '}
              {(currentPayrollParameters.patronal_inss_rate * 100).toFixed(0)}% ·{' '}
              {currentPayrollParameters.apply_lei_15270 ? 'IRRF L15.270 ativo' : 'Tabela padrão'}
            </span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-purple-800">
            PJ: ISS {(currentPayrollParameters.pj_default_iss_rate * 100).toFixed(1)}% · IRRF/PCC{' '}
            {(
              (currentPayrollParameters.pj_default_irrf_rate +
                currentPayrollParameters.pj_default_pcc_rate) *
              100
            ).toFixed(2)}
            % · {currentPayrollParameters.pj_require_nfse ? 'Exige NFS-e' : 'NFS-e opcional'}
          </span>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
          {(['all', 'clt', 'pj'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setRegimeFilter(mode)}
              className={`px-3 py-1 rounded-md transition-colors ${
                regimeFilter === mode
                  ? 'bg-white text-[#082175] shadow-xs'
                  : 'text-slate-600 hover:text-[#082175]'
              }`}
            >
              {mode === 'all' ? 'Todos' : mode === 'clt' ? 'CLT (PF)' : 'PJ (NFS-e)'}
            </button>
          ))}
        </div>
      </div>

      <PayrollSummaryKpis entries={entriesForCompetence} />

      {/* Tabela Analítica */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#082175]">
            Lançamentos da Competência ({competence})
          </h2>
          <span className="text-xs text-slate-500">
            {entriesForCompetence.length} registro(s) encontrado(s)
          </span>
        </div>

        {entriesForCompetence.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhum lançamento encontrado para {competence}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Clique em <strong>Gerar Competência</strong> para calcular CLT (PF) e PJ (NFS-e) em
              lote respeitando as datas de início e desligamento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">Colaborador / Prestador</th>
                  <th className="py-3 px-3 text-center font-semibold">Regime</th>
                  <th className="py-3 px-3 text-center font-semibold">Dias</th>
                  <th className="py-3 px-3 text-right font-semibold">Bruto / Valor NFS-e</th>
                  <th className="py-3 px-3 text-right font-semibold">INSS+IRRF / NFS-e</th>
                  <th className="py-3 px-3 text-right font-semibold">Líquido a Pagar</th>
                  <th className="py-3 px-3 text-center font-semibold">Situação</th>
                  <th className="py-3 px-3 text-center font-semibold">Perfil do Colaborador</th>
                  <th className="py-3 px-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entriesForCompetence.map((entry) => {
                  const emp = employees.find((e) => e.id === entry.employee_id);
                  const job = jobs.find((j) => j.id === emp?.job_id);
                  const isPj = (entry.contract_type || emp?.contract_type || 'clt') === 'pj';
                  const currentEmpRegime = emp?.contract_type || 'clt';
                  const hasRegimeMismatch = Boolean(emp && entry.contract_type && currentEmpRegime !== entry.contract_type);
                  const nfseBadge =
                    NFSE_STATUS_BADGE[entry.nfse_status || 'awaiting_issue'] ||
                    NFSE_STATUS_BADGE.awaiting_issue;
                  const vacCycleSummary = !isPj
                    ? analyzeEmployeeVacationCycles({
                        employee: emp,
                        competence,
                        existingEntries: payrollEntries,
                        excludeCompetence: competence,
                      })
                    : null;

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-[#082175]">
                            {emp?.full_name || 'Registro'}
                          </p>
                          {Number(entry.vacation_days || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                              Férias ({entry.vacation_days}d
                              {Number(entry.vacation_doubled_days || 0) > 0 ? ' · Dobra Art. 137' : ''}
                              )
                            </span>
                          )}
                          {Number(entry.vacation_days || 0) === 0 &&
                            vacCycleSummary &&
                            vacCycleSummary.totalOpenPeriodsCount > 0 && (
                              <span
                                title={vacCycleSummary.openCycles
                                  .map(
                                    (c) =>
                                      `Ciclo ${c.label}: ${
                                        c.status === 'expired_double'
                                          ? 'Vencida (Dobra Art. 137 CLT)'
                                          : 'No prazo concessivo (Art. 134 CLT)'
                                      }`
                                  )
                                  .join(' | ')}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  vacCycleSummary.expiredCycles.length > 0
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {vacCycleSummary.totalOpenPeriodsCount} Férias a tirar
                                {vacCycleSummary.expiredCycles.length > 0
                                  ? ` (${vacCycleSummary.expiredCycles.length} Vencida Art. 137)`
                                  : ''}
                              </span>
                            )}
                          {entry.leave_type && entry.leave_type !== 'none' && Number(entry.leave_days || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#082175] text-[10px] font-semibold">
                              Licença ({entry.leave_days}d)
                            </span>
                          )}
                          {entry.thirteenth_mode && entry.thirteenth_mode !== 'none' && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              13º Salário
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isPj ? emp?.pj_company_name || 'Prestador PJ' : job?.title || '-'} ·
                          Início {formatDateBR(emp?.hire_date)}
                          {entry.vacation_period_label ? ` · Ref. ${entry.vacation_period_label}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold ${
                              isPj
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]'
                            }`}
                          >
                            {isPj ? 'PJ' : 'CLT'}
                          </span>
                          {hasRegimeMismatch && (
                            <span
                              title={`Cadastro atualizado para ${currentEmpRegime.toUpperCase()}. Reabra para Rascunho e clique em Recalcular Rascunhos para atualizar.`}
                              className="text-[9px] font-semibold text-amber-700"
                            >
                              Cadastro: {currentEmpRegime.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{entry.worked_days}d</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatBRL(Number(entry.gross_salary))}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isPj ? (
                          <div className="inline-flex flex-col items-end gap-0.5">
                            <span
                              className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${nfseBadge.className}`}
                            >
                              {nfseBadge.label}
                            </span>
                            {entry.nfse_number && (
                              <span className="text-[10px] font-mono text-slate-500">
                                Nº {entry.nfse_number}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="font-mono text-red-700 text-[11px]">
                            <div>INSS -{formatBRL(Number(entry.inss_amount))}</div>
                            <div>IRRF -{formatBRL(Number(entry.irrf_amount))}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatBRL(Number(entry.net_salary))}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <select
                          aria-label="Situação da folha"
                          value={entry.status}
                          onChange={(e) =>
                            updatePayrollStatus(entry.id, e.target.value as PayrollStatus)
                          }
                          className={`text-[11px] font-semibold rounded-md border px-2 py-1 outline-none cursor-pointer ${
                            STATUS_BADGE[entry.status].className
                          }`}
                        >
                          <option value="draft">Rascunho</option>
                          <option value="closed">Fechada</option>
                          <option value="paid">Paga</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setPayslipEntry(entry)}
                          title="Recibo disponível no perfil individual do colaborador (clique para visualizar)"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md border px-2 py-0.5 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Vinculado ao Perfil</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setPayslipEntry(entry)}
                            title={isPj ? 'Autorização NFS-e' : 'Demonstrativo CLT'}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#082175] hover:bg-slate-50"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingEmployeeId(entry.employee_id)}
                            title="Editar cálculo"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#082175] hover:bg-slate-50"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            title="Excluir lançamento"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      <PayrollSettingsModal
        isOpen={showSettingsModal}
        tenantId={currentTenantId}
        companyName={currentCompany?.name || 'Empresa'}
        currentParameters={currentPayrollParameters}
        onClose={() => setShowSettingsModal(false)}
        onSave={async (params) => {
          await savePayrollParameters(params);
          setFeedback({
            type: 'success',
            text: 'Parâmetros globais PF (CLT) e PJ salvos e aplicados aos lançamentos em aberto!',
          });
        }}
      />

      {editingEmployeeId !== null && (
        <PayrollEntryModal
          employeeId={editingEmployeeId}
          competence={competence}
          employees={employees}
          jobs={jobs}
          existingEntries={payrollEntries}
          companyParameters={currentPayrollParameters}
          onClose={() => setEditingEmployeeId(null)}
          onSave={async (input) => {
            await upsertPayrollEntry(input);
            setFeedback({
              type: 'success',
              text: `Lançamento (${input.contractType === 'pj' ? 'PJ / NFS-e' : 'CLT / PF'}) salvo em ${competence}.`,
            });
          }}
        />
      )}

      <PayslipPreviewModal
        entry={payslipEntry}
        company={currentCompany}
        employee={employees.find((e) => e.id === payslipEntry?.employee_id)}
        job={jobs.find(
          (j) => j.id === employees.find((e) => e.id === payslipEntry?.employee_id)?.job_id
        )}
        onClose={() => setPayslipEntry(null)}
      />
    </div>
  );
};
