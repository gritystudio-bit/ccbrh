import React from 'react';
import type { ReinfEventRecord } from '../../types/database';
import {
  REINF_TABELA_01_NAT_REND,
  REINF_TABELA_06_SERVICOS,
} from '../../utils/reinf/reinfEngine';
import { BookOpenCheck, Landmark } from 'lucide-react';

interface ReinfTablesTotalsTabProps {
  competence: string;
  events: ReinfEventRecord[];
}

const formatBRL = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export const ReinfTablesTotalsTab: React.FC<ReinfTablesTotalsTabProps> = ({
  competence,
  events,
}) => {
  const activeCompEvents = events.filter(
    (e) => e.competence === competence && e.status !== 'excluded'
  );

  const r9001BaseCp = activeCompEvents.reduce(
    (s, e) => s + Number(e.return_totals?.r9001_base_cp || 0),
    0
  );
  const r9001RetCp = activeCompEvents.reduce(
    (s, e) => s + Number(e.return_totals?.r9001_ret_cp || 0),
    0
  );
  const r9001Cprb = activeCompEvents.reduce(
    (s, e) => s + Number(e.return_totals?.r9001_cprb || 0),
    0
  );

  const r9005BaseIr = activeCompEvents
    .filter((e) => e.event_series === 'r4000')
    .reduce((s, e) => s + Number(e.return_totals?.r9005_base_ir || 0), 0);
  const r9005Ir = activeCompEvents
    .filter((e) => e.event_series === 'r4000')
    .reduce((s, e) => s + Number(e.return_totals?.r9005_vlr_ir || 0), 0);
  const r9005Csrf = activeCompEvents
    .filter((e) => e.event_series === 'r4000')
    .reduce(
      (s, e) =>
        s +
        Number(e.return_totals?.r9005_vlr_csll || 0) +
        Number(e.return_totals?.r9005_vlr_cofins || 0) +
        Number(e.return_totals?.r9005_vlr_pp || 0),
      0
    );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-5 h-5 text-[#082175]" />
          <div>
            <h2 className="text-sm font-extrabold text-[#082175]">
              Espelho de Consolidação DCTFWeb · R-9011 (CP) & R-9015 (Retenções Fonte) — {competence}
            </h2>
            <p className="text-xs text-slate-500">
              Valores apurados a partir dos eventos periódicos R-2000 e R-4000 ativos nesta competência.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="font-bold text-slate-500 uppercase text-[10px]">
              R-9001 / R-9011 · Série R-2000 (CP)
            </p>
            <p className="text-lg font-extrabold text-[#082175] mt-1">
              {formatBRL(r9001RetCp + r9001Cprb)}
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Base Serviços: {formatBRL(r9001BaseCp)} · Retenção CP (11%/3,5%): {formatBRL(r9001RetCp)} ·
              CPRB: {formatBRL(r9001Cprb)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="font-bold text-slate-500 uppercase text-[10px]">
              R-9005 / R-9015 · IRRF Retido (170806 / 320806)
            </p>
            <p className="text-lg font-extrabold text-[#082175] mt-1">{formatBRL(r9005Ir)}</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Base Tributável Acumulada: {formatBRL(r9005BaseIr)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="font-bold text-slate-500 uppercase text-[10px]">
              R-9005 / R-9015 · CSRF PCC (595207)
            </p>
            <p className="text-lg font-extrabold text-emerald-700 mt-1">{formatBRL(r9005Csrf)}</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Total REINF RET p/ DCTFWeb: {formatBRL(r9005Ir + r9005Csrf)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <BookOpenCheck className="w-4 h-4 text-[#082175]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#082175]">
              Tabela 01 · Natureza de Rendimentos (natRend)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-4 py-2.5">Descrição</th>
                  <th className="px-4 py-2.5">Tributos / CR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {REINF_TABELA_01_NAT_REND.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-bold text-[#082175]">{item.code}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      <p className="font-semibold">{item.description}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.group} · Beneficiário: {item.beneficiaryType}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-600">
                      <p>{item.tributosPermitidos}</p>
                      <p className="font-mono text-[10px] text-slate-500">CR: {item.crMensalPadrao}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <BookOpenCheck className="w-4 h-4 text-[#9F8548]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#082175]">
              Tabela 06 · Serviços Cessão Mão de Obra (R-2010 / R-2020)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">tpServico</th>
                  <th className="px-4 py-2.5">Descrição Oficial EFD-Reinf v2.1.2b</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {REINF_TABELA_06_SERVICOS.map((srv) => (
                  <tr key={srv.code} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono font-bold text-[#082175]">{srv.code}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{srv.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
