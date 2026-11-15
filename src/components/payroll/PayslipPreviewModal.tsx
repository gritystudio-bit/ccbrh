import React from 'react';
import { Calendar, CheckCircle2, Printer, X } from 'lucide-react';
import { Company, Employee, Job, PayrollEntry } from '../../types/database';
import { printIsolatedPayslip } from '../../utils/payrollExport';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDateBR = (iso?: string | null) => {
  if (!iso) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

interface PayslipPreviewModalProps {
  entry: PayrollEntry | null;
  company: Company | null;
  employee?: Employee;
  job?: Job;
  onClose: () => void;
}

export const PayslipPreviewModal: React.FC<PayslipPreviewModalProps> = ({
  entry,
  company,
  employee,
  job,
  onClose,
}) => {
  if (!entry) return null;

  const isPj = (entry.contract_type || employee?.contract_type || 'clt') === 'pj';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-5">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
              {isPj
                ? 'Autorização de Emissão de NFS-e · Contrato PJ'
                : 'Demonstrativo de Pagamento · CLT'}
            </p>
            <h3 className="text-lg font-bold text-[#082175] mt-0.5">
              {company?.name || 'Empresa Cliente'}
            </h3>
            <p className="text-xs text-slate-500">CNPJ Tomador/Empregador: {company?.cnpj || '-'}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold bg-[#E0F4F7] text-[#03416A] px-2.5 py-1 rounded">
              Competência {entry.competence}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Status Envio:{' '}
              <strong>{entry.payslip_sent_status === 'sent' ? 'Enviado' : 'Pendente'}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div>
            <span className="text-slate-500">{isPj ? 'Prestador:' : 'Colaborador:'}</span>{' '}
            <strong className="text-slate-800">{employee?.full_name}</strong>
          </div>
          <div>
            <span className="text-slate-500">{isPj ? 'CNPJ PJ:' : 'CPF:'}</span>{' '}
            <strong className="text-slate-800">
              {isPj ? employee?.pj_cnpj || '-' : employee?.cpf || '-'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">{isPj ? 'Razão Social PJ:' : 'Cargo:'}</span>{' '}
            <strong className="text-slate-800">
              {isPj ? employee?.pj_company_name || '-' : job?.title || '-'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">
              {isPj ? 'Início Contrato / NFS-e:' : 'Admissão / Dias:'}
            </span>{' '}
            <strong className="text-slate-800">
              {isPj
                ? `${formatDateBR(employee?.hire_date)} · Nº ${entry.nfse_number || 'Aguardando'}`
                : `${formatDateBR(employee?.hire_date)} (${entry.worked_days} dias)`}
            </strong>
          </div>
        </div>

        {isPj ? (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-purple-900">Valor Autorizado para Emissão de NFS-e</p>
                <p className="text-[11px] text-purple-700">
                  Emitir contra {company?.name || 'Empresa'} ({company?.cnpj || '-'})
                </p>
              </div>
              <p className="text-lg font-extrabold font-mono text-purple-900">
                {formatBRL(Number(entry.gross_salary))}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">ISS Retido</span>
                <strong className="font-mono text-red-700">
                  -{formatBRL(Number(entry.pj_iss_amount ?? 0))}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">IRRF / PCC + Glosas</span>
                <strong className="font-mono text-red-700">
                  -{formatBRL(Number(entry.pj_retention_amount ?? 0) + Number(entry.other_discounts))}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Líquido a Transferir</span>
                <strong className="font-mono text-emerald-700">
                  {formatBRL(Number(entry.net_salary))}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-50 text-emerald-900 font-bold px-3 py-2 border-b border-emerald-100">
                Proventos
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span>Salário Proporcional ({entry.worked_days}d)</span>
                  <span className="font-mono">
                    {formatBRL((Number(entry.base_salary) / 30) * Number(entry.worked_days))}
                  </span>
                </div>
                {Number(entry.vacation_amount || 0) > 0 && (
                  <div className="flex justify-between text-amber-900">
                    <span>
                      Férias Gozadas ({entry.vacation_days || 0}d) + 1/3
                      {entry.vacation_period_label ? ` [${entry.vacation_period_label}]` : ''}
                    </span>
                    <span className="font-mono">{formatBRL(Number(entry.vacation_amount))}</span>
                  </div>
                )}
                {Number(entry.vacation_double_amount || 0) > 0 && (
                  <div className="flex justify-between text-rose-800 font-semibold">
                    <span>
                      Dobra de Férias Vencidas · Art. 137 CLT ({entry.vacation_doubled_days || 0}d + 1/3)
                    </span>
                    <span className="font-mono">
                      {formatBRL(Number(entry.vacation_double_amount))}
                    </span>
                  </div>
                )}
                {Number(entry.vacation_abono_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Abono Pecuniário ({entry.vacation_sold_days || 0}d · Isento)</span>
                    <span className="font-mono">
                      {formatBRL(Number(entry.vacation_abono_amount))}
                    </span>
                  </div>
                )}
                {Number(entry.leave_paid_amount || 0) > 0 && (
                  <div className="flex justify-between text-[#082175]">
                    <span>Licença / Afastamento Remunerado ({entry.leave_days || 0}d)</span>
                    <span className="font-mono">{formatBRL(Number(entry.leave_paid_amount))}</span>
                  </div>
                )}
                {Number(entry.thirteenth_amount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-900">
                    <span>13º Salário (Gratificação Natalina)</span>
                    <span className="font-mono">{formatBRL(Number(entry.thirteenth_amount))}</span>
                  </div>
                )}
                {Number(entry.overtime_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Horas Extras</span>
                    <span className="font-mono">{formatBRL(Number(entry.overtime_amount))}</span>
                  </div>
                )}
                {Number(entry.dsr_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>DSR sobre Variáveis</span>
                    <span className="font-mono">{formatBRL(Number(entry.dsr_amount))}</span>
                  </div>
                )}
                {Number(entry.bonuses) > 0 && (
                  <div className="flex justify-between">
                    <span>Bonificações / Comissões</span>
                    <span className="font-mono">{formatBRL(Number(entry.bonuses))}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 text-red-900 font-bold px-3 py-2 border-b border-red-100">
                Descontos
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span>INSS Progressivo</span>
                  <span className="font-mono text-red-700">
                    -{formatBRL(Number(entry.inss_amount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>IRRF Retido (c/ Lei 15.270)</span>
                  <span className="font-mono text-red-700">
                    -{formatBRL(Number(entry.irrf_amount))}
                  </span>
                </div>
                {Number(entry.vt_discount_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Vale-Transporte</span>
                    <span className="font-mono text-red-700">
                      -{formatBRL(Number(entry.vt_discount_amount))}
                    </span>
                  </div>
                )}
                {Number(entry.vr_discount) + Number(entry.other_discounts) > 0 && (
                  <div className="flex justify-between">
                    <span>VR / Outros Descontos</span>
                    <span className="font-mono text-red-700">
                      -{formatBRL(Number(entry.vr_discount) + Number(entry.other_discounts))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 grid grid-cols-3 gap-3 text-xs text-center">
          <div>
            <span className="text-slate-500 block">{isPj ? 'Valor NFS-e' : 'Total Bruto'}</span>
            <strong className="text-sm font-mono text-[#082175]">
              {formatBRL(Number(entry.gross_salary))}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Descontos / Retenções</span>
            <strong className="text-sm font-mono text-red-700">
              -{formatBRL(Number(entry.total_discounts))}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Líquido a Receber</span>
            <strong className="text-base font-mono text-emerald-700">
              {formatBRL(Number(entry.net_salary))}
            </strong>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            {entry.payslip_sent_status === 'sent' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span>{isPj ? 'Documento PJ / NFS-e' : 'Base Legal: CLT + Lei 15.270/2025'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printIsolatedPayslip({ company, entry, employee, job })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Via Única</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#082175] text-white font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
