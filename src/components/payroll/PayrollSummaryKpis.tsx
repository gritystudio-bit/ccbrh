import React from 'react';
import { Calculator, DollarSign, FileText, Users } from 'lucide-react';
import { PayrollEntry } from '../../types/database';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

interface PayrollSummaryKpisProps {
  entries: PayrollEntry[];
}

export const PayrollSummaryKpis: React.FC<PayrollSummaryKpisProps> = ({ entries }) => {
  const cltCount = entries.filter((e) => (e.contract_type || 'clt') !== 'pj').length;
  const pjCount = entries.filter((e) => e.contract_type === 'pj').length;

  const totalGross = entries.reduce((s, r) => s + Number(r.gross_salary), 0);
  const totalDiscounts = entries.reduce((s, r) => s + Number(r.total_discounts), 0);
  const totalNet = entries.reduce((s, r) => s + Number(r.net_salary), 0);
  const totalFgtsAndInss = entries.reduce(
    (s, r) => s + Number(r.fgts_amount) + Number(r.inss_patronal_amount),
    0
  );
  const totalProvisions = entries.reduce(
    (s, r) => s + Number(r.provision_13th) + Number(r.provision_vacation),
    0
  );
  const totalEmployerCost = totalGross + totalFgtsAndInss + totalProvisions;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Bruto CLT + Total NFS-e PJ</span>
          <Users className="w-4 h-4 text-[#082175]" />
        </div>
        <p className="text-xl font-bold text-[#082175] mt-1 font-mono tabular-nums">
          {formatBRL(totalGross)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          {cltCount} CLT (PF) · {pjCount} PJ (NFS-e)
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Descontos / Retenções</span>
          <Calculator className="w-4 h-4 text-[#9F8548]" />
        </div>
        <p className="text-xl font-bold text-slate-800 mt-1 font-mono tabular-nums">
          {formatBRL(totalDiscounts)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">INSS + IRRF (c/ L15.270) + Retenções PJ</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Total Líquido a Pagar</span>
          <DollarSign className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-xl font-bold text-emerald-700 mt-1 font-mono tabular-nums">
          {formatBRL(totalNet)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Salários PF + Transferências PJ</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Custo Total Empresa (PF + PJ)</span>
          <FileText className="w-4 h-4 text-[#03416A]" />
        </div>
        <p className="text-xl font-bold text-[#03416A] mt-1 font-mono tabular-nums">
          {formatBRL(totalEmployerCost)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Encargos/Provisões CLT: {formatBRL(totalFgtsAndInss + totalProvisions)}
        </p>
      </div>
    </div>
  );
};
