import type { Company, EsocialEmployerConfig } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-1020 — Tabela de Lotações Tributárias (FPAS e Terceiros - Tabelas 04, 10 e 22)
 * Regras Anexo II: REGRA_TABLOTACAO_VALIDA_FPASTERCEIROS
 */
export function buildEsocialS1020Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  iniValid: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, iniValid, sequence } = params;
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const isSimplesSubstituida = ['01', '02', '03', '04'].includes(config.class_trib);
  const effectiveCodTercs = isSimplesSubstituida ? '0000' : config.cod_tercs;

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtTabLotacao/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtTabLotacao Id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <infoLotacao>
      <inclusao>
        <ideLotacao>
          <codLotacao>${config.cod_lotacao}</codLotacao>
          <iniValid>${iniValid}</iniValid>
        </ideLotacao>
        <dadosLotacao>
          <tpLotacao>${config.tp_lotacao}</tpLotacao>
          <fpasLotacao>
            <fpas>${config.fpas}</fpas>
            <codTercs>${effectiveCodTercs}</codTercs>
          </fpasLotacao>
        </dadosLotacao>
      </inclusao>
    </infoLotacao>
  </evtTabLotacao>
</eSocial>`;

  return {
    eventCode: 'S-1020',
    eventName: ESOCIAL_EVENT_CATALOG['S-1020'].name,
    eventCategory: 'tabelas',
    eventUid,
    competence: iniValid,
    employeeId: null,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: [],
    validationWarnings: [],
    payloadSummary: {
      codLotacao: config.cod_lotacao,
      tpLotacao: config.tp_lotacao,
      fpas: config.fpas,
      codTercs: effectiveCodTercs,
    },
    xmlContent,
    returnTotals: null,
  };
}
