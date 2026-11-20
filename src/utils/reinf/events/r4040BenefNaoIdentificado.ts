import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR4040Input {
  competence: string;
  natRend: '19001' | '19009';
  dtFG: string;
  vlrLiq: number;
  descr: string;
  sequence?: number;
}

export function buildReinfR4040Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR4040Input;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];

  if (input.vlrLiq <= 0) {
    errors.push('vlrLiq deve ser maior que zero (R-4040 campo 22).');
  }
  if (!input.dtFG.startsWith(input.competence)) {
    errors.push(`dtFG (${input.dtFG}) deve estar na competência ${input.competence}.`);
  }

  // Regra R-4040 campo 23: vlrBaseIR = vlrLiq / 0,65 e vlrIR = 35% da base reajustada
  const vlrLiq = round2(input.vlrLiq);
  const vlrBaseIR = round2(vlrLiq / 0.65);
  const vlrIR = round2(vlrBaseIR * 0.35);

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence: input.sequence ?? 44,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtBenefNId/${REINF_SCHEMA_VERSION}">
  <evtBenefNId id="${eventUid}">
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
      <ideNat>
        <natRend>${input.natRend}</natRend>
        <infoPgto>
          <dtFG>${input.dtFG}</dtFG>
          <vlrLiq>${vlrLiq.toFixed(2)}</vlrLiq>
          <vlrBaseIR>${vlrBaseIR.toFixed(2)}</vlrBaseIR>
          <vlrIR>${vlrIR.toFixed(2)}</vlrIR>
          <descr>${sanitizeReinfText(input.descr, 200) || 'Pagamento sem identificação'}</descr>
        </infoPgto>
      </ideNat>
    </ideEstab>
  </evtBenefNId>
</Reinf>`;

  return {
    eventCode: 'R-4040',
    eventName: 'Beneficiários Não Identificados',
    eventSeries: 'r4000',
    eventUid,
    competence: input.competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: 'NAO_IDENTIFICADO',
    beneficiaryName: 'Beneficiário Não Identificado (IR 35%)',
    natRend: input.natRend,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      natRend: input.natRend,
      vlrLiq,
      vlrBaseIR,
      vlrIR,
      crDctfWeb: '521701',
    },
    xmlContent,
    returnTotals: {
      r9005_base_ir: vlrBaseIR,
      r9005_vlr_ir: vlrIR,
      r9015_dctfweb_ret: vlrIR,
    },
  };
}
