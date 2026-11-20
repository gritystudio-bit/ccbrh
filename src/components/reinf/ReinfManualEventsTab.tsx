import React, { useState } from 'react';
import { REINF_TABELA_01_NAT_REND, REINF_TABELA_06_SERVICOS } from '../../utils/reinf/reinfEngine';
import { FilePlus2, Loader2 } from 'lucide-react';

export interface ReinfManualEventFormPayload {
  kind: 'R-4020' | 'R-4010' | 'R-2010' | 'R-2020' | 'R-2060' | 'R-4040' | 'R-4080' | 'R-1070';
  doc: string;
  name: string;
  natRendOrService: string;
  dateOrDocNum: string;
  grossAmount: number;
  irAmount: number;
  csrfAmount: number;
  indCprb?: 0 | 1;
  aliquotaCprb?: number;
  observ?: string;
}

interface ReinfManualEventsTabProps {
  competence: string;
  busyAction: string | null;
  onGenerateManualEvent: (payload: ReinfManualEventFormPayload) => Promise<void>;
}

export const ReinfManualEventsTab: React.FC<ReinfManualEventsTabProps> = ({
  competence,
  busyAction,
  onGenerateManualEvent,
}) => {
  const [kind, setKind] = useState<ReinfManualEventFormPayload['kind']>('R-4010');
  const [doc, setDoc] = useState('');
  const [name, setName] = useState('');
  const [natRendOrService, setNatRendOrService] = useState('12001');
  const [dateOrDocNum, setDateOrDocNum] = useState(`${competence}-20`);
  const [grossAmount, setGrossAmount] = useState('5000');
  const [irAmount, setIrAmount] = useState('0');
  const [csrfAmount, setCsrfAmount] = useState('0');
  const [indCprb, setIndCprb] = useState<0 | 1>(0);
  const [aliquotaCprb, setAliquotaCprb] = useState('2.5');
  const [observ, setObserv] = useState('');

  const handleKindChange = (next: ReinfManualEventFormPayload['kind']) => {
    setKind(next);
    if (next === 'R-4010') setNatRendOrService('12001');
    if (next === 'R-4020') setNatRendOrService('15014');
    if (next === 'R-2010' || next === 'R-2020') setNatRendOrService('100000001');
    if (next === 'R-2060') setNatRendOrService('00000010');
    if (next === 'R-4040') setNatRendOrService('19001');
    if (next === 'R-4080') setNatRendOrService('20001');
    if (next === 'R-1070') setNatRendOrService('2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerateManualEvent({
      kind,
      doc,
      name,
      natRendOrService,
      dateOrDocNum,
      grossAmount: Number(grossAmount || 0),
      irAmount: Number(irAmount || 0),
      csrfAmount: Number(csrfAmount || 0),
      indCprb,
      aliquotaCprb: Number(aliquotaCprb || 2.5),
      observ,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5"
    >
      <div>
        <h2 className="text-base font-extrabold text-[#082175]">
          Lançamento Avulso de Eventos EFD-Reinf v2.1.2b
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Gere diretamente eventos R-4010 (Lucros/Aluguel PF), R-4020 (NF PJ), R-2010/R-2020 (INSS
          11%/3,5%), R-2060 (CPRB), R-4040, R-4080 ou Processos R-1070.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Evento EFD-Reinf</label>
          <select
            value={kind}
            onChange={(e) => handleKindChange(e.target.value as ReinfManualEventFormPayload['kind'])}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-[#082175]"
          >
            <option value="R-4010">R-4010 · Pagamento PF (Aluguel / Dividendos)</option>
            <option value="R-4020">R-4020 · Pagamento PJ Avulso (IRRF/CSRF)</option>
            <option value="R-2010">R-2010 · Serviços Tomados (INSS 11% / 3,5%)</option>
            <option value="R-2020">R-2020 · Serviços Prestados (Retenção Destacada)</option>
            <option value="R-2060">R-2060 · CPRB sobre Receita Bruta</option>
            <option value="R-4040">R-4040 · Beneficiário Não Identificado (35%)</option>
            <option value="R-4080">R-4080 · Retenção no Recebimento (Autorretenção)</option>
            <option value="R-1070">R-1070 · Processo Adm./Judicial Suspensivo</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            {kind === 'R-4010'
              ? 'CPF do Beneficiário'
              : kind === 'R-1070'
              ? 'Número do Processo (CNJ/Adm)'
              : kind === 'R-2060'
              ? 'CNPJ Estabelecimento (Automático)'
              : 'CNPJ Contraparte / Prestador'}
          </label>
          <input
            type="text"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            placeholder={kind === 'R-4010' ? '000.000.000-00' : '00.000.000/0001-00'}
            required={kind !== 'R-2060' && kind !== 'R-4040'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Nome / Razão Social / Descrição</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Sócio Administrador ou Fornecedor Ltda"
            required
            className="w-full px-3 py-2 rounded-xl border border-slate-200"
          />
        </div>

        {(kind === 'R-4010' || kind === 'R-4020' || kind === 'R-4040' || kind === 'R-4080') && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Natureza do Rendimento (Tabela 01 · natRend)
            </label>
            <select
              value={natRendOrService}
              onChange={(e) => setNatRendOrService(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              {REINF_TABELA_01_NAT_REND.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.code} · {n.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {(kind === 'R-2010' || kind === 'R-2020') && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tipo de Serviço (Tabela 06)</label>
            <select
              value={natRendOrService}
              onChange={(e) => setNatRendOrService(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              {REINF_TABELA_06_SERVICOS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} · {s.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {kind === 'R-2010' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">Enquadramento CPRB do Prestador</label>
            <select
              value={indCprb}
              onChange={(e) => setIndCprb(Number(e.target.value) as 0 | 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            >
              <option value={0}>0 · Não desonerado (Retenção INSS 11%)</option>
              <option value={1}>1 · Contribuinte CPRB (Retenção 3,5%)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block font-bold text-slate-700 mb-1">
            {kind === 'R-2010' || kind === 'R-2020'
              ? 'Nº da Nota Fiscal / RPS'
              : `Data Fato Gerador (${competence}-DD)`}
          </label>
          <input
            type="text"
            value={dateOrDocNum}
            onChange={(e) => setDateOrDocNum(e.target.value)}
            placeholder={kind === 'R-2010' || kind === 'R-2020' ? 'NF-001234' : `${competence}-20`}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
          />
        </div>

        {kind !== 'R-1070' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {kind === 'R-4040' ? 'Valor Líquido Pago (vlrLiq R$)' : 'Valor Bruto / Base (R$)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
          </div>
        )}

        {(kind === 'R-4010' || kind === 'R-4020' || kind === 'R-4080') && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">IRRF Retido (vlrIR R$)</label>
            <input
              type="number"
              step="0.01"
              value={irAmount}
              onChange={(e) => setIrAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
          </div>
        )}

        {kind === 'R-4020' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              CSRF Retido — PCC 4,65% (CSLL/Cofins/PIS R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={csrfAmount}
              onChange={(e) => setCsrfAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
          </div>
        )}

        {kind === 'R-2060' && (
          <div>
            <label className="block font-bold text-slate-700 mb-1">Alíquota CPRB (%)</label>
            <input
              type="number"
              step="0.1"
              value={aliquotaCprb}
              onChange={(e) => setAliquotaCprb(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
          </div>
        )}

        <div className="md:col-span-3">
          <label className="block font-bold text-slate-700 mb-1">Observações Fiscais (opcional)</label>
          <input
            type="text"
            value={observ}
            onChange={(e) => setObserv(e.target.value)}
            placeholder="Referência contratual, contrato ou memória fiscal"
            className="w-full px-3 py-2 rounded-xl border border-slate-200"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={busyAction !== null}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {busyAction === 'manual' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FilePlus2 className="w-4 h-4 text-[#f5a90e]" />
          )}
          <span>Validar & Enfileirar {kind}</span>
        </button>
      </div>
    </form>
  );
};
