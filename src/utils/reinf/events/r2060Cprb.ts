import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR2060Input {
  competence: string;
  codAtivEcon: string;
  vlrRecBrutaAtiv: number;
  vlrExcRecBruta?: number;
  aliquotaPercent: number;
  sequence?: number;
}

export function buildReinfR2060Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR2060Input;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];

  if (config.ind_desoneracao !== 1) {
    errors.push(
      'R-2060 exige indDesoneracao = 1 no R-1000 (empresa optante pela CPRB · Lei 12.546/2011).'
    );
  }
  if (input.vlrRecBrutaAtiv <= 0) {
    errors.push('vlrRecBrutaAtiv deve ser maior que zero.');
  }

  const exclusoes = round2(Math.max(0, input.vlrExcRecBruta ?? 0));
  const vlrBcCPRB = round2(Math.max(0, input.vlrRecBrutaAtiv - exclusoes));
  const vlrCPRBapur = round2((vlrBcCPRB * input.aliquotaPercent) / 100);
  const codAtiv = cleanDigits(input.codAtivEcon, '00000010').slice(0, 8).padStart(8, '0');

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence: input.sequence ?? 12,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtCPRB/${REINF_SCHEMA_VERSION}">
  <evtCPRB id="${eventUid}">
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
    <infoCPRB>
      <ideEstab>
        <tpInscEstab>1</tpInscEstab>
        <nrInscEstab>${cnpjEstab || '00000000000000'}</nrInscEstab>
        <vlrRecBrutaTotal>${round2(input.vlrRecBrutaAtiv).toFixed(2)}</vlrRecBrutaTotal>
        <vlrCPApurTotal>${vlrCPRBapur.toFixed(2)}</vlrCPApurTotal>
        <tipoCod>
          <codAtivEcon>${codAtiv}</codAtivEcon>
          <vlrRecBrutaAtiv>${round2(input.vlrRecBrutaAtiv).toFixed(2)}</vlrRecBrutaAtiv>
          <vlrExcRecBruta>${exclusoes.toFixed(2)}</vlrExcRecBruta>
          <vlrAdicRecBruta>0.00</vlrAdicRecBruta>
          <vlrBcCPRB>${vlrBcCPRB.toFixed(2)}</vlrBcCPRB>
          <vlrCPRBapur>${vlrCPRBapur.toFixed(2)}</vlrCPRBapur>
        </tipoCod>
      </ideEstab>
    </infoCPRB>
  </evtCPRB>
</Reinf>`;

  return {
    eventCode: 'R-2060',
    eventName: 'CPRB — Contribuição sobre Receita Bruta',
    eventSeries: 'r2000',
    eventUid,
    competence: input.competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjEstab,
    beneficiaryName: company.name,
    natRend: codAtiv,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      codAtivEcon: codAtiv,
      vlrBcCPRB,
      aliquotaPercent: input.aliquotaPercent,
      vlrCPRBapur,
      crDctfWeb: '299101',
    },
    xmlContent,
    returnTotals: {
      r9001_cprb: vlrCPRBapur,
    },
  };
}
