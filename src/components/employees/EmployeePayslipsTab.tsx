import React, { useState, useMemo } from 'react';
import {
  Company,
  Employee,
  Job,
  PayrollEntry,
  PayrollStatus,
} from '../../types/database';
import { printIsolatedPayslip } from '../../utils/payrollExport';
import { PayslipPreviewModal } from '../payroll/PayslipPreviewModal';
import { supabase } from '../../lib/supabase';
import {
  FileText,
  Printer,
  Calendar,
  Eye,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Loader2,
  X,
} from 'lucide-react';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatCompetenceLabel = (competence: string) => {
  const [year, month] = competence.split('-');
  if (!year || !month) return competence;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const STATUS_BADGE: Record<PayrollStatus, { label: string; className: string }> = {
  draft: { label: 'Em Processamento', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  closed: { label: 'Competência Fechada', className: 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]' },
  paid: { label: 'Quitado / Pago', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
};

interface EmployeePayslipsTabProps {
  employee: Employee;
  job?: Job;
  company: Company | null;
  payrollEntries: PayrollEntry[];
}

export const EmployeePayslipsTab: React.FC<EmployeePayslipsTabProps> = ({
  employee,
  job,
  company,
  payrollEntries,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);

  const sortedEntries = useMemo(() => {
    return [...payrollEntries]
      .filter((e) => e.employee_id === employee.id)
      .sort((a, b) => b.competence.localeCompare(a.competence));
  }, [payrollEntries, employee.id]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-[#082175]">
            Recibos de Pagamento & Demonstrativos (Holerites / NFS-e)
          </h3>
          <div className="w-10 h-0.5 bg-[#f5a90e] mt-1.5 rounded-full" />
          <p className="text-xs text-slate-500 mt-2">
            Todos os recibos gerados na Folha de Pagamento ficam automaticamente vinculados a este perfil.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F4F7] text-[#03416A] text-xs font-bold">
          <FileText className="w-3.5 h-3.5" />
          <span>{sortedEntries.length} competência(s) vinculada(s)</span>
        </span>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
          <Calendar className="w-7 h-7 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Nenhum recibo de competência gerado até o momento
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Assim que a equipe técnica da CCB clicar em &ldquo;Gerar Competência&rdquo; no módulo Folha de Pagamento, os recibos aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map((entry) => {
            const isPj = (entry.contract_type || employee.contract_type || 'clt') === 'pj';
            const badge = STATUS_BADGE[entry.status] || STATUS_BADGE.draft;
            const totalDiscounts = Number(entry.total_discounts || 0);

            return (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-[#082175]/30 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#082175] text-[#f5a90e] flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                    {entry.competence.split('-')[1]}/{entry.competence.split('-')[0].slice(2)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-[#082175] capitalize">
                        {formatCompetenceLabel(entry.competence)}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isPj
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-[#E0F4F7] text-[#03416A] border-[#c8e8ed]'
                        }`}
                      >
                        {isPj ? 'Autorização NFS-e PJ' : 'Holerite CLT'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {Number(entry.vacation_days || 0) > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Férias ({entry.vacation_days}d)
                        </span>
                      )}
                      {entry.thirteenth_mode && entry.thirteenth_mode !== 'none' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          13º Salário
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1.5 font-mono">
                      <span>
                        Bruto: <strong className="text-slate-800">{formatBRL(Number(entry.gross_salary))}</strong>
                      </span>
                      <span>
                        Descontos: <strong className="text-red-700">-{formatBRL(totalDiscounts)}</strong>
                      </span>
                      <span>
                        Líquido:{' '}
                        <strong className="text-emerald-700 text-sm">
                          {formatBRL(Number(entry.net_salary))}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#f5a90e]" />
                    <span>Visualizar Recibo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printIsolatedPayslip({
                        company,
                        entry,
                        employee,
                        job,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PayslipPreviewModal
        entry={selectedEntry}
        company={company}
        employee={employee}
        job={job}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
};

interface EmployeeAccessGrantModalProps {
  employee: Employee;
  job?: Job;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const EmployeeAccessGrantModal: React.FC<EmployeeAccessGrantModalProps> = ({
  employee,
  job,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('ccbrh2026');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().length < 6) {
      setErrorMsg('A senha inicial deve ter ao menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.rpc('invite_or_create_team_user', {
        p_email: employee.email.trim().toLowerCase(),
        p_full_name: employee.full_name.trim(),
        p_role: 'company_manager',
        p_role_label: 'Colaborador · Acesso Exclusivo ao Perfil',
        p_department: job?.department || 'Colaborador',
        p_initial_password: password.trim(),
      });
      if (error) throw error;
      onSuccess(
        `Acesso exclusivo ao perfil liberado para ${employee.full_name} (${employee.email}). Ao entrar, verá apenas seu próprio perfil e recibos.`
      );
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao liberar acesso exclusivo ao perfil.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#E0F4F7] text-[#082175] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#082175]">
                Liberar Acesso Exclusivo ao Perfil
              </h3>
              <p className="text-[11px] text-slate-500">
                Portal Individual do Colaborador (Sem acesso aos demais módulos)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleGrantAccess} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <p className="text-slate-500">
              Colaborador: <strong className="text-[#082175]">{employee.full_name}</strong>
            </p>
            <p className="text-slate-500">
              E-mail de Login: <strong className="font-mono text-slate-800">{employee.email}</strong>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#E0F4F7]/60 border border-[#c8e8ed] text-[#03416A] flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Quando <strong>{employee.full_name}</strong> acessar o sistema com este e-mail, será direcionado <strong>exclusivamente ao seu próprio Perfil 360º, Documentos e Recibos/Holerites</strong>, sem visualizar a plataforma administrativa.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Senha Inicial de Acesso
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs text-slate-800 focus:border-[#082175] outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#f5a90e]" />
              )}
              <span>{submitting ? 'Liberando...' : 'Ativar Acesso ao Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
