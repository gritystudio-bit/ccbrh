import type { Company, EsocialEmployerConfig } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, generateEsocialEventId, sanitizeText } from '../helpers';
import {
  ESOCIAL_S13_NAMESPACE_VERSION,
  type BuiltEsocialEventDraft,
  type EsocialRubricaS1010,
} from '../types';

/**
 * Evento S-1010 — Tabela de Rubricas da Folha de Pagamento (Tabelas 03 e 21 do Anexo I)
 * Regras Anexo II: REGRA_CARACTERE_ESPECIAL, REGRA_TABRUBR_INCLUSAO
 */
export function buildEsocialS1010Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  rubrica: EsocialRubricaS1010;
  iniValid: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, rubrica, iniValid, sequence } = params;
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  if (rubrica.codRubr.toLowerCase().startsWith('esocial')) {
    errors.push("REGRA_CARACTERE_ESPECIAL: codRubr não pode iniciar com a expressão 'eSocial'.");
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtTabRubrica/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtTabRubrica Id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <infoRubrica>
      <inclusao>
        <ideRubrica>
          <codRubr>${rubrica.codRubr}</codRubr>
          <ideTabRubr>${config.ide_tab_rubr}</ideTabRubr>
          <iniValid>${iniValid}</iniValid>
        </ideRubrica>
        <dadosRubrica>
          <dscRubr>${sanitizeText(rubrica.dscRubr, 100)}</dscRubr>
          <natRubr>${rubrica.natRubr}</natRubr>
          <tpRubr>${rubrica.tpRubr}</tpRubr>
          <codIncCP>${rubrica.codIncCP}</codIncCP>
          <codIncIRRF>${rubrica.codIncIRRF}</codIncIRRF>
          <codIncFGTS>${rubrica.codIncFGTS}</codIncFGTS>
        </dadosRubrica>
      </inclusao>
    </infoRubrica>
  </evtTabRubrica>
</eSocial>`;

  return {
    eventCode: 'S-1010',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-1010'].name} (${rubrica.codRubr})`,
    eventCategory: 'tabelas',
    eventUid,
    competence: iniValid,
    employeeId: null,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      codRubr: rubrica.codRubr,
      dscRubr: rubrica.dscRubr,
      natRubr: rubrica.natRubr,
      tpRubr: rubrica.tpRubr,
      codIncCP: rubrica.codIncCP,
      codIncIRRF: rubrica.codIncIRRF,
      codIncFGTS: rubrica.codIncFGTS,
    },
    xmlContent,
    returnTotals: null,
  };
}
