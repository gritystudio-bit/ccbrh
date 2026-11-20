import React from 'react';
import type { EsocialEmployerConfig } from '../../types/database';
import { ESOCIAL_TABELA_08_CLASS_TRIB } from '../../utils/esocial/catalogs';
import { Loader2 } from 'lucide-react';

interface EsocialEmployerConfigTabProps {
  config: EsocialEmployerConfig;
  setConfig: React.Dispatch<React.SetStateAction<EsocialEmployerConfig>>;
  saving: boolean;
  onSave: () => Promise<void>;
}

export const EsocialEmployerConfigTab: React.FC<EsocialEmployerConfigTabProps> = ({
  config,
  setConfig,
  saving,
  onSave,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5 text-xs">
      <div className="border-b border-slate-100 pb-3">
        <h2 className="text-sm font-bold text-[#082175]">
          Parâmetros Fiscais e Previdenciários do Empregador (S-1000, S-1005 e S-1020)
        </h2>
        <p className="text-[11px] text-slate-500">
          Configurações utilizadas na montagem dos envelopes XML S-1.3 e na apuração GILRAT / FPAS /
          Terceiros para a DCTFWeb.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Ambiente de Destino (tpAmb)
          </label>
          <select
            value={config.tp_amb}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, tp_amb: Number(e.target.value) as 1 | 2 }))
            }
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
          >
            <option value={2}>2 · Produção Restrita (Testes / Homologação)</option>
            <option value={1}>1 · Produção Oficial (Validade Jurídica)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">
            Classificação Tributária (classTrib · Tabela 08 do Anexo I)
          </label>
          <select
            value={config.class_trib}
            onChange={(e) => setConfig((prev) => ({ ...prev, class_trib: e.target.value }))}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
          >
            {ESOCIAL_TABELA_08_CLASS_TRIB.map((ct) => (
              <option key={ct.code} value={ct.code}>
                {ct.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Código FPAS (Tabela 04)
          </label>
          <input
            type="text"
            maxLength={3}
            value={config.fpas}
            onChange={(e) => setConfig((prev) => ({ ...prev, fpas: e.target.value }))}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Código Terceiros (codTercs · Tabela 04)
          </label>
          <input
            type="text"
            maxLength={4}
            value={config.cod_tercs}
            onChange={(e) => setConfig((prev) => ({ ...prev, cod_tercs: e.target.value }))}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            CNAE Preponderante (7 dígitos · S-1005)
          </label>
          <input
            type="text"
            maxLength={7}
            value={config.cnae_prep}
            onChange={(e) => setConfig((prev) => ({ ...prev, cnae_prep: e.target.value }))}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Alíquota RAT (1%, 2% ou 3% · S-1005)
          </label>
          <select
            value={Math.round(config.aliq_rat)}
            onChange={(e) => setConfig((prev) => ({ ...prev, aliq_rat: Number(e.target.value) }))}
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
          >
            <option value={1}>1% (Risco Leve)</option>
            <option value={2}>2% (Risco Médio)</option>
            <option value={3}>3% (Risco Grave)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            FAP (0.5000 a 2.0000 · S-1005)
          </label>
          <input
            type="number"
            step="0.0001"
            min={0.5}
            max={2.0}
            value={config.fap}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                fap: Math.min(2, Math.max(0.5, Number(e.target.value) || 1)),
              }))
            }
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            CNPJ Sindicato Padrão (14 dígitos · S-2200)
          </label>
          <input
            type="text"
            maxLength={14}
            value={config.cnpj_sind_default}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, cnpj_sind_default: e.target.value }))
            }
            className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="min-h-[42px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white font-bold cursor-pointer"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>Salvar Parâmetros S-1000 / S-1005 / S-1020</span>
        </button>
      </div>
    </div>
  );
};
