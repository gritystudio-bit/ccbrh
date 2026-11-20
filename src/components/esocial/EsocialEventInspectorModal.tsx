import React from 'react';
import type { EsocialEventRecord } from '../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../../utils/esocial/esocialS13Engine';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileCheck2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

interface EsocialEventInspectorModalProps {
  event: EsocialEventRecord | null;
  onClose: () => void;
  onExcludeWithS3000: (evt: EsocialEventRecord) => Promise<void>;
  onDeleteDraft: (evt: EsocialEventRecord) => Promise<void>;
}

const formatBRL = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export const EsocialEventInspectorModal: React.FC<EsocialEventInspectorModalProps> = ({
  event,
  onClose,
  onExcludeWithS3000,
  onDeleteDraft,
}) => {
  if (!event) return null;

  const meta = ESOCIAL_EVENT_CATALOG[event.event_code];

  const handleDownloadXml = () => {
    const blob = new Blob([event.xml_content], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.event_code}_${event.event_uid}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyXml = () => {
    void navigator.clipboard.writeText(event.xml_content);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-5 text-xs">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-[#082175] text-white font-mono font-bold text-xs">
                {event.event_code}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9F8548]">
                Leiaute S-1.3 (NT 07/2026) · Amb. {event.tp_amb === 1 ? 'Produção (1)' : 'Produção Restrita (2)'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#082175] mt-1">
              {event.event_name}
            </h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Id (36 pos. · REGRA_VALIDA_ID_EVENTO): <strong>{event.event_uid}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar inspetor"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status, Recibo RET e Prazo Legal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Status no RET / Validador
            </span>
            <span className="font-bold text-slate-800 text-xs">
              {event.status === 'accepted'
                ? 'Recepcionado com Sucesso (RET)'
                : event.status === 'validated'
                ? 'Validado (Pronto p/ Transmissão)'
                : event.status === 'rejected'
                ? 'Rejeitado (Crítica Anexo II)'
                : event.status === 'excluded'
                ? 'Excluído por S-3000'
                : 'Pendente'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Recibo de Entrega (nrRecibo · 23 pos.)
            </span>
            <span className="font-mono font-bold text-[#082175]">
              {event.receipt_number || 'Aguardando transmissão ao WebService'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Prazo Legal (Manual eSocial)
            </span>
            <span className="text-[11px] text-slate-700">
              {meta?.legalDeadline || 'Até o dia 15 do mês subsequente'}
            </span>
          </div>
        </div>

        {/* Críticas de Validação Anexo II */}
        {event.validation_errors.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-1 text-red-900">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              Impedimentos Anexo II (Regras de Validação S-1.3):
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {event.validation_errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Conformidade Anexo II Validada:</strong> Estrutura XSD{' '}
              <code className="font-mono">v_S_01_03_00</code>, chave de 36 caracteres (
              <code className="font-mono">REGRA_VALIDA_ID_EVENTO</code>) e regras de negócio aprovadas.
            </span>
          </div>
        )}

        {event.validation_warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 space-y-1 text-amber-900">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              Alertas Não Impeditivos (RET aceita com alerta):
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
              {event.validation_warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Totalizadores de Retorno do Governo (S-5001, S-5002, S-5003, S-5011, S-5012, S-5013) */}
        {event.return_totals && (
          <div className="rounded-xl border border-[#082175]/20 bg-[#E0F4F7]/35 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#082175] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#082175]" />
                Eventos Totalizadores de Retorno (S-5001 / S-5002 / S-5003 / DCTFWeb)
              </span>
              <span className="text-[10px] font-semibold text-slate-600">
                Apuração Oficial S-1.3
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              {typeof event.return_totals.s5001_inss_segurado === 'number' && (
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">S-5001 · INSS Segurado</span>
                  <strong className="font-mono text-sm text-[#082175]">
                    {formatBRL(event.return_totals.s5001_inss_segurado)}
                  </strong>
                </div>
              )}
              {typeof event.return_totals.s5002_irrf_retido === 'number' && (
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">
                    S-5002 · IRRF (CR 056107)
                  </span>
                  <strong className="font-mono text-sm text-emerald-700">
                    {formatBRL(event.return_totals.s5002_irrf_retido)}
                    {event.return_totals.s5002_lei15270_isento ? ' (Isento L15.270)' : ''}
                  </strong>
                </div>
              )}
              {typeof event.return_totals.s5003_fgts_mensal === 'number' && (
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">
                    S-5003 · FGTS Digital (8%)
                  </span>
                  <strong className="font-mono text-sm text-[#082175]">
                    {formatBRL(event.return_totals.s5003_fgts_mensal)}
                  </strong>
                </div>
              )}
              {typeof event.return_totals.s5011_cp_patronal === 'number' && (
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">
                    S-5011 · CP Patronal + RAT
                  </span>
                  <strong className="font-mono text-sm text-[#082175]">
                    {formatBRL(
                      Number(event.return_totals.s5011_cp_patronal || 0) +
                        Number(event.return_totals.s5011_gilrat || 0)
                    )}
                  </strong>
                </div>
              )}
              {typeof event.return_totals.s5013_fgts_digital_total === 'number' && (
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">
                    S-5013 · FGTS Consolidado
                  </span>
                  <strong className="font-mono text-sm text-emerald-800">
                    {formatBRL(event.return_totals.s5013_fgts_digital_total)}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumo de Campos do Evento */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Resumo dos Campos Chave do Leiaute
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {Object.entries(event.payload_summary || {}).map(([k, v]) => (
              <div key={k} className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5">
                <span className="text-[10px] text-slate-400 block">{k}</span>
                <strong className="font-mono text-slate-800 break-all">
                  {v === null || v === undefined ? '-' : String(v)}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* XML S-1.3 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#082175] flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-[#9F8548]" />
              Payload XML Oficial eSocial S-1.3 (XSD v_S_01_03_00)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyXml}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar XML</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadXml}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#f5a90e]" />
                <span>Baixar .XML</span>
              </button>
            </div>
          </div>
          <pre className="bg-slate-950 text-emerald-300 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-72 leading-relaxed">
            {event.xml_content}
          </pre>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {event.status === 'accepted' && event.event_code !== 'S-3000' && event.event_code !== 'S-1299' && (
              <button
                type="button"
                onClick={() => void onExcludeWithS3000(event)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold cursor-pointer"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Gerar Exclusão S-3000 (nrRecEvt)</span>
              </button>
            )}
            {event.status !== 'accepted' && (
              <button
                type="button"
                onClick={() => void onDeleteDraft(event)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover da Fila</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
