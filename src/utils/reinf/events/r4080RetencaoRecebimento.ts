import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR4080Input {
  competence: string;
  cnpjFonte: string;
  nomeFonte: string;
  natRend: string;
  dtFG: string;
  vlrBruto: number;
  vlrIR: number;
  sequence?: number;
}

export function buildReinfR4080Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR4080Input;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const cnpjFonte = cleanDigits(input.cnpjFonte, '');
  const errors: string[] = [];

  if (cnpjFonte.length !== 14) {
    errors.push('REGRA_VALIDA_FONTPAG: cnpjFont deve possuir 14 dígitos válidos.');
  } else if (cnpjFonte === cnpjEstab) {
    errors.push('cnpjFont não pode ser igual ao CNPJ do declarante.');
  }
  if (!input.natRend.startsWith('20')) {
    errors.push('R-4080 exige natRend do Grupo 20 da Tabela 01 (ex.: 20001).');
  }

  const vlrBruto = round2(input.vlrBruto);
  const vlrIR = round2(input.vlrIR);

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence: input.sequence ?? 48,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtRetRec/${REINF_SCHEMA_VERSION}">
  <evtRetRec id="${eventUid}">
    <ideEvento>
      <indRetif>1</indRetif>
      <perApur>${input.competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
    <ideEstab>
      <tpInscEstab>1</tpInscEstab>
      <nrInscEstab>${cnpjEstab || '00000000000000'}</nrInscEstab>
      <ideFont>
        <cnpjFont>${cnpjFonte || '00000000000000'}</cnpjFont>
        <ideRend>
          <natRend>${cleanDigits(input.natRend, '20001').slice(0, 5)}</natRend>
          <infoRec>
            <dtFG>${input.dtFG}</dtFG>
            <vlrBruto>${vlrBruto.toFixed(2)}</vlrBruto>
            <vlrBaseIR>${vlrBruto.toFixed(2)}</vlrBaseIR>
            <vlrIR>${vlrIR.toFixed(2)}</vlrIR>
          </infoRec>
        </ideRend>
      </ideFont>
    </ideEstab>
  </evtRetRec>
</Reinf>`;

  return {
    eventCode: 'R-4080',
    eventName: 'Retenção no Recebimento (Autorretenção)',
    eventSeries: 'r4000',
    eventUid,
    competence: input.competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjFonte,
    beneficiaryName: sanitizeReinfText(input.nomeFonte, 70) || 'Fonte Pagadora',
    natRend: cleanDigits(input.natRend, '20001').slice(0, 5),
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      cnpjFonte,
      natRend: input.natRend,
      vlrBruto,
      vlrIR,
      crDctfWeb: '804506',
    },
    xmlContent,
    returnTotals: {
      r9005_base_ir: vlrBruto,
      r9005_vlr_ir: vlrIR,
      r9015_dctfweb_ret: vlrIR,
    },
  };
}
