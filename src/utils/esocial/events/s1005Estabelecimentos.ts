import type { Company, EsocialEmployerConfig } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-1005 — Tabela de Estabelecimentos, Obras ou Unidades (Matriz / Filiais + GILRAT)
 * Regras Anexo II: REGRA_TABESTAB_VALIDA_ESTABELECIMENTO, REGRA_EXISTE_INFO_EMPREGADOR
 */
export function buildEsocialS1005Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  iniValid: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, iniValid, sequence } = params;
  const cnpjFull = cleanDigits(company?.cnpj).padEnd(14, '0').slice(0, 14);
  const cnpjRoot = cleanDigits(company?.cnpj_root) || cnpjFull.slice(0, 8);
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  if (cleanDigits(company?.cnpj).length !== 14) {
    errors.push(
      'REGRA_TABESTAB_VALIDA_ESTABELECIMENTO: CNPJ do estabelecimento em S-1005 deve conter 14 posições.'
    );
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtTabEstab/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtTabEstab Id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideEmpregador>
    <infoEstab>
      <inclusao>
        <ideEstab>
          <tpInsc>1</tpInsc>
          <nrInsc>${cnpjFull}</nrInsc>
          <iniValid>${iniValid}</iniValid>
        </ideEstab>
        <dadosEstab>
          <cnaePrep>${cleanDigits(config.cnae_prep, '6201501').slice(0, 7)}</cnaePrep>
          <aliqGilrat>
            <aliqRat>${Math.round(config.aliq_rat)}</aliqRat>
            <fap>${Number(config.fap).toFixed(4)}</fap>
          </aliqGilrat>
        </dadosEstab>
      </inclusao>
    </infoEstab>
  </evtTabEstab>
</eSocial>`;

  return {
    eventCode: 'S-1005',
    eventName: ESOCIAL_EVENT_CATALOG['S-1005'].name,
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
      estabelecimento: company?.name || 'Matriz',
      cnpjEstab: cnpjFull,
      cnaePrep: config.cnae_prep,
      aliqRat: config.aliq_rat,
      fap: config.fap,
    },
    xmlContent,
    returnTotals: null,
  };
}
