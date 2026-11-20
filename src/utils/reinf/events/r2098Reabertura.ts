import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export function buildReinfR2098Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  competence: string;
  sequence?: number;
}): BuiltReinfEventDraft {
  const { company, config, competence, sequence = 98 } = params;
  const cnpj = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpj.slice(0, 8)).slice(0, 8);

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtReabreEvPer/${REINF_SCHEMA_VERSION}">
  <evtReabreEvPer id="${eventUid}">
    <ideEvento>
      <perApur>${competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
  </evtReabreEvPer>
</Reinf>`;

  return {
    eventCode: 'R-2098',
    eventName: 'Reabertura da Série R-2000',
    eventSeries: 'controle',
    eventUid,
    competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjRoot || cnpj,
    beneficiaryName: company.name,
    natRend: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: [],
    validationWarnings: [],
    payloadSummary: {
      competence,
      serie: 'R-2000',
      regra: 'REGRA_REABERT_VALIDA_PER_APUR_2000',
    },
    xmlContent,
    returnTotals: null,
  };
}
