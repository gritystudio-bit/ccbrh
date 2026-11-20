import React from 'react';
import type { ReinfContributorConfig } from '../../types/database';
import {
  REINF_TABELA_01_NAT_REND,
  REINF_TABELA_06_SERVICOS,
  REINF_TABELA_08_CLASS_TRIB,
} from '../../utils/reinf/reinfEngine';
import { Loader2, Save } from 'lucide-react';

interface ReinfContributorConfigTabProps {
  config: ReinfContributorConfig;
  setConfig: React.Dispatch<React.SetStateAction<ReinfContributorConfig>>;
  busyAction: string | null;
  onSaveConfig: () => void;
}

export const ReinfContributorConfigTab: React.FC<ReinfContributorConfigTabProps> = ({
  config,
  setConfig,
  busyAction,
  onSaveConfig,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-[#082175]">
            Parâmetros do Contribuinte (Evento R-1000 · v2.1.2b)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurações enviadas no R-1000 e aplicadas na geração dos eventos R-2000 e R-4000.
          </p>
        </div>
        <button
          type="button"
          onClick={onSaveConfig}
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {busyAction === 'save_config' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4 text-[#f5a90e]" />
          )}
          <span>Salvar Configuração R-1000</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Ambiente (tpAmb)</label>
          <select
            value={config.tp_amb}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, tp_amb: Number(e.target.value) as 1 | 2 }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            <option value={2}>2 · Produção Restrita (pre-reinf)</option>
            <option value={1}>1 · Produção Oficial (reinf.receita)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">
            Classificação Tributária (Tabela 08 · classTrib)
          </label>
          <select
            value={config.class_trib}
            onChange={(e) => setConfig((prev) => ({ ...prev, class_trib: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            {REINF_TABELA_08_CLASS_TRIB.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Obrigatoriedade ECD (indEscrituracao)</label>
          <select
            value={config.ind_escrituracao}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, ind_escrituracao: Number(e.target.value) as 0 | 1 }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            <option value={1}>1 · Empresa Obrigada à ECD</option>
            <option value={0}>0 · Empresa Não Obrigada à ECD</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Desoneração CPRB (Lei 12.546/11)</label>
          <select
            value={config.ind_desoneracao}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, ind_desoneracao: Number(e.target.value) as 0 | 1 }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            <option value={0}>0 · Não aplicável</option>
            <option value={1}>1 · Enquadrada na CPRB (habilita R-2060)</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Situação PJ (indSitPJ)</label>
          <select
            value={config.ind_sit_pj}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                ind_sit_pj: Number(e.target.value) as 0 | 1 | 2 | 3 | 4,
              }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            <option value={0}>0 · Situação Normal</option>
            <option value={1}>1 · Extinção</option>
            <option value={2}>2 · Fusão</option>
            <option value={3}>3 · Cisão</option>
            <option value={4}>4 · Incorporação</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            natRend Padrão Prestadores PJ (R-4020)
          </label>
          <select
            value={config.default_nat_rend_pj}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, default_nat_rend_pj: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            {REINF_TABELA_01_NAT_REND.filter((n) => n.beneficiaryType !== 'PF').map((n) => (
              <option key={n.code} value={n.code}>
                {n.code} · {n.description}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">
            Serviço CP Padrão (Tabela 06 · R-2010 / R-2020)
          </label>
          <select
            value={config.default_tp_servico_cp}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, default_tp_servico_cp: e.target.value }))
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
          >
            {REINF_TABELA_06_SERVICOS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} · {s.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Nome Contato (contato/nmCtt)</label>
          <input
            type="text"
            value={config.contato_nome}
            onChange={(e) => setConfig((prev) => ({ ...prev, contato_nome: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">CPF Contato (contato/cpfCtt)</label>
          <input
            type="text"
            maxLength={14}
            value={config.contato_cpf}
            onChange={(e) => setConfig((prev) => ({ ...prev, contato_cpf: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">E-mail Fiscal (contato/email)</label>
          <input
            type="email"
            value={config.contato_email}
            onChange={(e) => setConfig((prev) => ({ ...prev, contato_email: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">
            Responsável Fechamento (ideRespInf/nmResp)
          </label>
          <input
            type="text"
            value={config.resp_nome}
            onChange={(e) => setConfig((prev) => ({ ...prev, resp_nome: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">CPF Responsável (cpfResp)</label>
          <input
            type="text"
            maxLength={14}
            value={config.resp_cpf}
            onChange={(e) => setConfig((prev) => ({ ...prev, resp_cpf: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Telefone (DDD + número)</label>
          <input
            type="text"
            value={config.contato_fone}
            onChange={(e) => setConfig((prev) => ({ ...prev, contato_fone: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
          />
        </div>
      </div>
    </div>
  );
};
