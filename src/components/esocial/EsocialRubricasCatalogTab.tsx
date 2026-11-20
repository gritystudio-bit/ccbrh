import React from 'react';
import { ESOCIAL_STANDARD_RUBRICAS_S1010 } from '../../utils/esocial/catalogs';

export const EsocialRubricasCatalogTab: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-sm font-bold text-[#082175]">
          Catálogo Padrão de Rubricas S-1010 (Anexo I · Tabela 03 Natureza das Rubricas & Tabela 21
          Incidência IRRF)
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Todas as verbas calculadas na Folha de Pagamento (Salário, Férias + 1/3, Abono Isento,
          Dobra Art. 137, 13º, INSS, IRRF Lei 15.270/2025, VT, VR PAT e Plano de Saúde) são
          automaticamente mapeadas para estes códigos no evento S-1200.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">Código (codRubr)</th>
              <th className="py-3 px-3 text-left font-semibold">Descrição da Rubrica</th>
              <th className="py-3 px-3 text-center font-semibold">Nat. Tabela 03</th>
              <th className="py-3 px-3 text-center font-semibold">Tipo (tpRubr)</th>
              <th className="py-3 px-3 text-center font-semibold">INSS (codIncCP)</th>
              <th className="py-3 px-3 text-center font-semibold">IRRF (Tabela 21)</th>
              <th className="py-3 px-4 text-center font-semibold">FGTS (codIncFGTS)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ESOCIAL_STANDARD_RUBRICAS_S1010.map((rub) => (
              <tr key={rub.codRubr} className="hover:bg-slate-50/70">
                <td className="py-2.5 px-4 font-mono font-bold text-[#082175]">{rub.codRubr}</td>
                <td className="py-2.5 px-3">
                  <span className="font-semibold text-slate-800 block">{rub.dscRubr}</span>
                  <span className="text-[10px] text-slate-500">{rub.natRubrDesc}</span>
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                  {rub.natRubr}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rub.tpRubr === 1
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {rub.tpRubr === 1 ? '1 · Vencimento' : '2 · Desconto'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center font-mono">{rub.codIncCP}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-[#082175]">
                  {rub.codIncIRRF}
                </td>
                <td className="py-2.5 px-4 text-center font-mono">{rub.codIncFGTS}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
