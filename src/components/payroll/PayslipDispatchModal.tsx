import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail, Send, X } from 'lucide-react';
import { Company, Employee, Job, PayrollEntry, PayslipSentStatus } from '../../types/database';
import { buildPayslipEmailSummary } from '../../utils/payrollExport';

interface PayslipDispatchModalProps {
  isOpen: boolean;
  competence: string;
  company: Company | null;
  entries: PayrollEntry[];
  employees: Employee[];
  jobs: Job[];
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  notice: string | null;
  setNotice: React.Dispatch<React.SetStateAction<string | null>>;
  onClose: () => void;
  onServerDispatch: (ids: string[]) => Promise<{
    providerConfigured: boolean;
    sentCount: number;
    failedCount: number;
    message?: string;
  }>;
  onMarkStatus: (ids: string[], status: PayslipSentStatus, channel: string) => Promise<void>;
}

export const PayslipDispatchModal: React.FC<PayslipDispatchModalProps> = ({
  isOpen,
  competence,
  company,
  entries,
  employees,
  jobs,
  selectedIds,
  setSelectedIds,
  notice,
  setNotice,
  onClose,
  onServerDispatch,
  onMarkStatus,
}) => {
  const [dispatching, setDispatching] = useState(false);

  if (!isOpen) return null;

  const handleBulkDispatch = async () => {
    if (selectedIds.length === 0) return;
    setDispatching(true);
    setNotice(null);
    try {
      const res = await onServerDispatch(selectedIds);
      if (res.providerConfigured) {
        setNotice(
          `Disparo concluído: ${res.sentCount} enviado(s) e ${res.failedCount} com falha.`
        );
      } else {
        setNotice(
          res.message ||
            'O disparo automático direto ainda não está habilitado para esta conta. Utilize os botões de envio individual abaixo ou marque como enviado após encaminhar.'
        );
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erro ao tentar disparar.');
    } finally {
      setDispatching(false);
    }
  };

  const handleMarkSelected = async (status: PayslipSentStatus, channel: string) => {
    if (selectedIds.length === 0) return;
    setDispatching(true);
    try {
      await onMarkStatus(selectedIds, status, channel);
      setNotice(`${selectedIds.length} registro(s) atualizado(s) com sucesso.`);
    } finally {
      setDispatching(false);
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
              Disparo de Demonstrativos CLT & Autorizações PJ
            </p>
            <h3 className="text-lg font-bold text-[#082175] mt-0.5">
              Enviar Competência {competence}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Envie para todos os colaboradores CLT ou prestadores PJ e acompanhe o status de entrega.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {notice && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-700">
            {selectedIds.length} de {entries.length} selecionado(s)
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds(entries.map((e) => e.id))}
              className="text-[#082175] font-semibold hover:underline"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  entries.filter((e) => e.payslip_sent_status !== 'sent').map((e) => e.id)
                )
              }
              className="text-[#03416A] font-semibold hover:underline"
            >
              Apenas pendentes
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {entries.map((entry) => {
            const emp = employees.find((e) => e.id === entry.employee_id);
            const job = jobs.find((j) => j.id === emp?.job_id);
            const checked = selectedIds.includes(entry.id);
            const isSent = entry.payslip_sent_status === 'sent';
            const isPj = (entry.contract_type || emp?.contract_type || 'clt') === 'pj';
            const body = buildPayslipEmailSummary({ company, entry, employee: emp, job });
            const subject = encodeURIComponent(
              isPj
                ? `Autorização NFS-e PJ (${entry.competence}) - ${company?.name || 'CCB RH'}`
                : `Demonstrativo de Pagamento (${entry.competence}) - ${company?.name || 'CCB RH'}`
            );
            const mailHref = `mailto:${encodeURIComponent(emp?.email || '')}?subject=${subject}&body=${encodeURIComponent(body)}`;

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs hover:bg-slate-50"
              >
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleId(entry.id)}
                    className="rounded border-slate-300 text-[#082175]"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {emp?.full_name || 'Colaborador'}{' '}
                      <span className="text-[10px] font-semibold text-slate-500">
                        ({isPj ? 'PJ' : 'CLT'})
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {emp?.email || 'Sem e-mail'}
                    </p>
                  </div>
                </label>

                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                    isSent
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {isSent ? 'Enviado' : 'Pendente'}
                </span>

                {emp?.email && (
                  <a
                    href={mailHref}
                    onClick={() => onMarkStatus([entry.id], 'sent', 'email_client')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-[#082175] hover:bg-[#E0F4F7] font-semibold shrink-0"
                  >
                    <Mail className="w-3 h-3" />
                    <span>E-mail</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={dispatching || selectedIds.length === 0}
              onClick={() => handleMarkSelected('sent', 'manual')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marcar como Enviado</span>
            </button>
            <button
              type="button"
              disabled={dispatching || selectedIds.length === 0}
              onClick={() => handleMarkSelected('pending', 'manual')}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold disabled:opacity-50"
            >
              Reabrir Pendente
            </button>
          </div>

          <button
            type="button"
            disabled={dispatching || selectedIds.length === 0}
            onClick={handleBulkDispatch}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold disabled:opacity-60"
          >
            {dispatching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Disparar em Lote ({selectedIds.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
