import React, { useState, useMemo } from 'react';
import { useCcb } from '../context/CcbContext';
import {
  EmployeeContractType,
  PayrollEntry,
} from '../types/database';
import { exportPayrollToExcel } from '../utils/payrollExport';
import { PayrollSummaryKpis } from './payroll/PayrollSummaryKpis';
import { PayrollCompetenceTable } from './payroll/PayrollCompetenceTable';
import { PayrollSettingsModal } from './payroll/PayrollSettingsModal';
import { PayrollEntryModal } from './payroll/PayrollEntryModal';
import { PayslipPreviewModal } from './payroll/PayslipPreviewModal';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getCurrentCompetence = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const PayrollModule: React.FC = () => {
  const {
    currentTenantId,
    currentCompany,
    employees,
    jobs,
    payrollEntries,
    employeeVacations,
    employeeBenefits,
    currentPayrollParameters,
    savePayrollParameters,
    generateCompetencePayroll,
    syncDraftPayroll,
    upsertPayrollEntry,
    updatePayrollStatus,
    deletePayrollEntry,
    updateEmployeeVacation,
    launchVacationToPayroll,
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

      <PayrollCompetenceTable
        competence={competence}
        entries={entriesForCompetence}
        allPayrollEntries={payrollEntries}
        employees={employees}
        jobs={jobs}
        employeeVacations={employeeVacations}
        employeeBenefits={employeeBenefits}
        payrollParameters={currentPayrollParameters}
        onUpdateStatus={updatePayrollStatus}
        onPreviewPayslip={(entry) => setPayslipEntry(entry)}
        onEditEntry={(empId) => setEditingEmployeeId(empId)}
        onDeleteEntry={handleDeleteEntry}
        onApproveVacation={async (vacationId) => {
          await updateEmployeeVacation(vacationId, {
            status: 'approved',
            approved_at: new Date().toISOString(),
          });
          setFeedback({
            type: 'success',
            text: 'Solicitação de férias aprovada pelo Gestor / RH. Pronta para integração à Folha.',
          });
        }}
        onLaunchVacationToPayroll={async (vacationId) => {
          await launchVacationToPayroll(vacationId);
          setFeedback({
            type: 'success',
            text: `Férias integradas automaticamente à Folha de Pagamento da competência ${competence}.`,
          });
        }}
      />

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
