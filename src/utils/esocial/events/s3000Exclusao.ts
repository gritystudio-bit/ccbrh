import type { Company, EsocialEmployerConfig, EsocialEventCode } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-3000 — Exclusão de Eventos Transmitidos
 * Regras Anexo II: REGRA_EVE_EXCLUSAO_VALIDA_NRRECIBO
 */
export function buildEsocialS3000Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  tpEventoExcluido: EsocialEventCode;
  nrRecEvt: string;
  cpfTrab?: string | null;
  perApur?: string | null;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, tpEventoExcluido, nrRecEvt, cpfTrab, perApur, sequence } = params;
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  if (!nrRecEvt) {
    errors.push(
      'REGRA_EVE_EXCLUSAO_VALIDA_NRRECIBO: O recibo do evento original (nrRecEvt) é obrigatório para S-3000.'
    );
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExclusao/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtExclusao Id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <infoExclusao>
      <tpEvento>${tpEventoExcluido}</tpEvento>
      <nrRecEvt>${nrRecEvt}</nrRecEvt>
${
  cpfTrab
    ? `      <ideTrabalhador>\n        <cpfTrab>${cleanDigits(cpfTrab)
        .padEnd(11, '0')
        .slice(0, 11)}</cpfTrab>\n      </ideTrabalhador>\n`
    : ''
}${
  perApur
    ? `      <ideFolhaPagto>\n        <indApuracao>1</indApuracao>\n        <perApur>${perApur}</perApur>\n      </ideFolhaPagto>\n`
    : ''
}    </infoExclusao>
  </evtExclusao>
</eSocial>`;

  return {
    eventCode: 'S-3000',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-3000'].name} (Ref. ${tpEventoExcluido})`,
    eventCategory: 'controle',
    eventUid,
    competence: perApur || null,
    employeeId: null,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      tpEvento: tpEventoExcluido,
      nrRecEvt,
      perApur: perApur || null,
    },
    xmlContent,
    returnTotals: null,
  };
}
