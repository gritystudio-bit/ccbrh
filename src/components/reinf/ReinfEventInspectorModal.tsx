import React, { useState } from 'react';
import type { ReinfEventRecord } from '../../types/database';
import { Check, Code2, Copy, Download, ShieldAlert, ShieldCheck, X } from 'lucide-react';

interface ReinfEventInspectorModalProps {
  event: ReinfEventRecord | null;
  onClose: () => void;
}

const formatBRL = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export const ReinfEventInspectorModal: React.FC<ReinfEventInspectorModalProps> = ({
  event,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(event.xml_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadXml = () => {
    const blob = new Blob([event.xml_content], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.event_code}_${event.event_uid}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-[#082175] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5 text-[#f5a90e]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold truncate">
                {event.event_code} · {event.event_name}
              </p>
              <p className="text-[11px] text-slate-300 font-mono truncate">
                ID: {event.event_uid} · Competência: {event.competence || 'Tabela'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white cursor-pointer"
            aria-label="Fechar inspetor XML"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-500">Recibo / Protocolo</p>
              <p className="font-mono font-bold text-[#082175] mt-1">
                {event.receipt_number || 'Pendente de envio'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Lote: {event.protocol_number || '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-500">Beneficiário / Escopo</p>
              <p className="font-bold text-slate-800 mt-1 truncate">
                {event.beneficiary_name || 'Declarante'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {event.beneficiary_doc || '—'} · natRend {event.nat_rend || '—'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Totalizadores R-9001 / R-9005
              </p>
              {event.return_totals ? (
                <div className="mt-1 space-y-0.5 text-[11px] font-semibold text-slate-700">
                  {event.return_totals.r9001_ret_cp !== undefined && (
                    <p>CP Retida (R-9001): {formatBRL(event.return_totals.r9001_ret_cp)}</p>
                  )}
                  {event.return_totals.r9001_cprb !== undefined && (
                    <p>CPRB (R-9001): {formatBRL(event.return_totals.r9001_cprb)}</p>
                  )}
                  {event.return_totals.r9005_vlr_ir !== undefined && (
                    <p>IRRF Fonte (R-9005): {formatBRL(event.return_totals.r9005_vlr_ir)}</p>
                  )}
                  {(event.return_totals.r9005_vlr_csll ||
                    event.return_totals.r9005_vlr_cofins ||
                    event.return_totals.r9005_vlr_pp) ? (
                    <p>
                      CSRF (R-9005):{' '}
                      {formatBRL(
                        Number(event.return_totals.r9005_vlr_csll || 0) +
                          Number(event.return_totals.r9005_vlr_cofins || 0) +
                          Number(event.return_totals.r9005_vlr_pp || 0)
                      )}
                    </p>
                  ) : null}
                  {event.return_totals.r9011_dctfweb_cp !== undefined && (
                    <p className="text-[#082175]">
                      DCTFWeb CP (R-9011): {formatBRL(event.return_totals.r9011_dctfweb_cp)}
                    </p>
                  )}
                  {event.return_totals.r9015_dctfweb_ret !== undefined && (
                    <p className="text-[#082175]">
                      DCTFWeb RET (R-9015): {formatBRL(event.return_totals.r9015_dctfweb_ret)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">Evento estrutural/controle sem débito</p>
              )}
            </div>
          </div>

          {event.validation_errors.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <ShieldAlert className="w-4 h-4" />
                <span>Críticas de Validação (Anexo II EFD-Reinf v2.1.2b)</span>
              </div>
              <ul className="list-disc pl-5 text-xs text-red-700 space-y-1">
                {event.validation_errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Estrutura XML e regras do Anexo II v2.1.2b aprovadas sem bloqueios para transmissão.
              </span>
            </div>
          )}

          {event.validation_warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold">Alertas Preventivos:</p>
              {event.validation_warnings.map((w, i) => (
                <p key={i}>• {w}</p>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                XML Oficial EFD-Reinf v2.1.2b (v2_01_02)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar XML'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadXml}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#082175] hover:bg-[#0a2a8a] text-white text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#f5a90e]" />
                  <span>Baixar .xml</span>
                </button>
              </div>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-300 text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
              {event.xml_content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
