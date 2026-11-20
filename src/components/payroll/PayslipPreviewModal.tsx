import React from 'react';
import { Calendar, CheckCircle2, Printer, X } from 'lucide-react';
import { Company, Employee, Job, PayrollEntry } from '../../types/database';
import { printIsolatedPayslip } from '../../utils/payrollExport';
import {
  decomposePayrollEntryToS1200Items,
  deriveCbo,
  deriveMatricula,
} from '../../utils/esocial/esocialS13Engine';

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
  const matricula = employee ? deriveMatricula(employee) : 'MAT-0001';
  const cbo = deriveCbo(job);
  const rubricas = !isPj
    ? decomposePayrollEntryToS1200Items(entry, 'TABRUB01', { includeZeroIrrf: true })
    : [];
  const baseInss = Math.max(
    0,
    Number(entry.gross_salary || 0) -
      Number(entry.vacation_abono_amount || 0) -
      Number(entry.vacation_double_amount || 0) -
      Number(entry.absence_discount_amount || 0)
  );
  const baseIrrf = Math.max(0, baseInss - Number(entry.inss_amount || 0));

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
              {isPj
                ? 'Autorização de Emissão de NFS-e · Contrato PJ'
                : 'Recibo de Pagamento de Salário · Padrão eSocial S-1.3 (S-1200 / S-1210)'}
            </p>
            <h3 className="text-lg font-bold text-[#082175] mt-0.5">
              {company?.name || 'Empresa Cliente'}
            </h3>
            <p className="text-xs text-slate-500">
              CNPJ Empregador: {company?.cnpj || '-'}
              {!isPj ? ` · Demonstrativo ideDmDev: DM-${entry.competence.replace('-', '')}-${matricula}` : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold bg-[#E0F4F7] text-[#03416A] px-2.5 py-1 rounded">
              Competência {entry.competence}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              {isPj ? 'Regime B2B (NFS-e)' : 'Categoria eSocial: 101 (Empregado CLT)'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <div>
            <span className="text-slate-500 block">{isPj ? 'Prestador:' : 'Trabalhador:'}</span>
            <strong className="text-slate-800">{employee?.full_name}</strong>
          </div>
          <div>
            <span className="text-slate-500 block">{isPj ? 'CNPJ PJ:' : 'CPF / Matrícula eSocial:'}</span>
            <strong className="text-slate-800 font-mono">
              {isPj ? employee?.pj_cnpj || '-' : `${employee?.cpf || '-'} · ${matricula}`}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">{isPj ? 'Razão Social PJ:' : 'Cargo / CBO:'}</span>
            <strong className="text-slate-800">
              {isPj ? employee?.pj_company_name || '-' : `${job?.title || '-'} (CBO ${cbo})`}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">
              {isPj ? 'Início Contrato / NFS-e:' : 'Admissão / Jornada:'}
            </span>
            <strong className="text-slate-800">
              {isPj
                ? `${formatDateBR(employee?.hire_date)} · Nº ${entry.nfse_number || 'Aguardando'}`
                : `${formatDateBR(employee?.hire_date)} (${entry.worked_days} dias)`}
            </strong>
          </div>
          {!isPj && (
            <>
              <div>
                <span className="text-slate-500 block">Salário Base (vrSalFx):</span>
                <strong className="text-slate-800 font-mono">
                  {formatBRL(Number(entry.base_salary))}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Dependentes IRRF (Tab. 07):</span>
                <strong className="text-slate-800">{Number(entry.dependents_count || 0)}</strong>
              </div>
            </>
          )}
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
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-[#082175] text-white text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">Cód. S-1010</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Nat. Tab. 03</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Descrição da Rubrica</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Ref.</th>
                  <th className="py-2.5 px-2 text-center font-semibold">Incid. CP/IR/FGTS</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Vencimentos</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Descontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rubricas.map((item) => (
                  <tr key={item.codRubr} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-[#082175]">
                      {item.codRubr}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-semibold text-slate-600">
                      {item.natRubr}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">{item.dscRubr}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500">
                      {item.refLabel}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-400">
                      {item.codIncCP}/{item.codIncIRRF}/{item.codIncFGTS}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                      {item.tpRubr === 1 ? formatBRL(item.vrRubr) : ''}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-rose-700">
                      {item.tpRubr === 2
                        ? item.vrRubr === 0
                          ? 'R$ 0,00 (Isento)'
                          : `-${formatBRL(item.vrRubr)}`
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé de Bases eSocial S-5001 / S-5002 / S-5003 e Líquido S-1210 */}
        {!isPj && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
            <div>
              <span className="text-slate-500 block">Base INSS (S-5001)</span>
              <strong className="font-mono text-slate-800">{formatBRL(baseInss)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Base FGTS (S-5003)</span>
              <strong className="font-mono text-slate-800">{formatBRL(baseInss)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">FGTS do Mês (8%)</span>
              <strong className="font-mono text-[#082175]">
                {formatBRL(Number(entry.fgts_amount))}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Base IRRF (S-5002 · CR 056107)</span>
              <strong className="font-mono text-slate-800">{formatBRL(baseIrrf)}</strong>
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 grid grid-cols-3 gap-3 text-xs text-center">
          <div>
            <span className="text-slate-500 block">
              {isPj ? 'Valor NFS-e' : 'Total Vencimentos (tpRubr=1)'}
            </span>
            <strong className="text-sm font-mono text-[#082175]">
              {formatBRL(Number(entry.gross_salary))}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">
              {isPj ? 'Retenções / Glosas' : 'Total Descontos (tpRubr=2)'}
            </span>
            <strong className="text-sm font-mono text-red-700">
              -{formatBRL(Number(entry.total_discounts))}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block">Líquido a Receber (vrLiq S-1210)</span>
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
            <span>
              {isPj
                ? 'Documento PJ / NFS-e'
                : 'Leiaute eSocial v. S-1.3 (Tabelas 03 e 21) + CLT + Lei 15.270/2025'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printIsolatedPayslip({ company, entry, employee, job })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Holerite eSocial</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#082175] text-white font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
