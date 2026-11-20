import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export function buildReinfR1070Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  tpProc: 1 | 2;
  nrProc: string;
  iniValid: string;
  indSusp?: string;
  dtDecisao?: string;
  indDeposito?: 'S' | 'N';
  codSusp?: string;
  sequence?: number;
}): BuiltReinfEventDraft {
  const {
    company,
    config,
    tpProc,
    nrProc,
    iniValid,
    indSusp = '90',
    dtDecisao = `${iniValid}-01`,
    indDeposito = 'N',
    codSusp = '1',
    sequence = 2,
  } = params;

  const cnpj = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpj.slice(0, 8)).slice(0, 8);
  const procClean = nrProc.replace(/[^a-zA-Z0-9]/g, '').slice(0, 21);
  const errors: string[] = [];

  if (!procClean || procClean.length < 10) {
    errors.push('nrProc deve conter número de processo administrativo/judicial válido.');
  }
  if (!/^\d{4}-\d{2}$/.test(iniValid)) {
    errors.push('iniValid deve estar no formato AAAA-MM.');
  }

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtTabProcesso/${REINF_SCHEMA_VERSION}">
  <evtTabProcesso id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
    <infoProcesso>
      <inclusao>
        <ideProcesso>
          <tpProc>${tpProc}</tpProc>
          <nrProc>${procClean}</nrProc>
          <iniValid>${iniValid}</iniValid>
          <infoSusp>
            <codSusp>${cleanDigits(codSusp, '1').slice(0, 14)}</codSusp>
            <indSusp>${indSusp}</indSusp>
            <dtDecisao>${dtDecisao}</dtDecisao>
            <indDeposito>${indDeposito}</indDeposito>
          </infoSusp>
        </ideProcesso>
      </inclusao>
    </infoProcesso>
  </evtTabProcesso>
</Reinf>`;

  return {
    eventCode: 'R-1070',
    eventName: 'Tabela de Processos Adm./Judiciais',
    eventSeries: 'tabelas',
    eventUid,
    competence: iniValid,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: procClean,
    beneficiaryName: tpProc === 2 ? 'Processo Judicial' : 'Processo Administrativo',
    natRend: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      tpProc,
      nrProc: procClean,
      indSusp,
      indDeposito,
    },
    xmlContent,
    returnTotals: null,
  };
}
