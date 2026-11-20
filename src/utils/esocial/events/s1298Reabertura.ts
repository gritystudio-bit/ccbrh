import type { Company, EsocialEmployerConfig } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-1298 — Reabertura dos Eventos Periódicos
 * Regras Anexo II: REGRA_REABERTURA_VALIDA_PERIODO_APURACAO
 */
export function buildEsocialS1298Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  competence: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, competence, sequence } = params;
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtReabreEvPer/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtReabreEvPer Id="${eventUid}">
    <ideEvento>
      <indApuracao>1</indApuracao>
      <perApur>${competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
  </evtReabreEvPer>
</eSocial>`;

  return {
    eventCode: 'S-1298',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-1298'].name} (${competence})`,
    eventCategory: 'periodicos',
    eventUid,
    competence,
    employeeId: null,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: [],
    validationWarnings: [],
    payloadSummary: {
      perApur: competence,
      indApuracao: 1,
    },
    xmlContent,
    returnTotals: null,
  };
}
