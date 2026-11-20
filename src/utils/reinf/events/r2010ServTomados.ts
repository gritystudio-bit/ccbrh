import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR2010Input {
  competence: string;
  cnpjPrestador: string;
  nomePrestador: string;
  serieNf?: string;
  numDocto: string;
  dtEmissaoNF: string;
  vlrBruto: number;
  vlrBaseRet: number;
  indCPRB: 0 | 1;
  tpServico?: string;
  indObra?: 0 | 1 | 2;
  indRetif?: 1 | 2;
  nrRecibo?: string;
  sequence?: number;
}

export function buildReinfR2010Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR2010Input;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const cnpjPrestador = cleanDigits(input.cnpjPrestador, '');
  const errors: string[] = [];

  if (cnpjEstab.length !== 14) {
    errors.push('Estabelecimento contratante sem CNPJ de 14 dígitos válido.');
  }
  if (cnpjPrestador.length !== 14) {
    errors.push('REGRA_EVE_VALIDO_PREST: cnpjPrestador deve possuir 14 dígitos válidos.');
  } else if (cnpjPrestador === cnpjEstab) {
    errors.push('cnpjPrestador não pode ser igual ao CNPJ do declarante (R-2010 campo 20).');
  }
  if (!input.dtEmissaoNF.startsWith(input.competence)) {
    errors.push(`dtEmissaoNF (${input.dtEmissaoNF}) deve pertencer ao período ${input.competence}.`);
  }
  if (input.vlrBruto <= 0 || input.vlrBaseRet <= 0) {
    errors.push('vlrBruto e vlrBaseRet devem ser maiores que zero.');
  }

  const aliquota = input.indCPRB === 1 ? 0.035 : 0.11;
  const vlrRetencao = round2(input.vlrBaseRet * aliquota);
  const tpServico = cleanDigits(input.tpServico || config.default_tp_servico_cp, '100000028').slice(
    0,
    9
  );
  const indObra = input.indObra ?? 0;
  const indRetif = input.indRetif ?? 1;

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence: input.sequence ?? 10,
  });

  const retifTag =
    indRetif === 2 && input.nrRecibo
      ? `\n      <nrRecibo>${sanitizeReinfText(input.nrRecibo, 52)}</nrRecibo>`
      : '';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtTomadorServicos/${REINF_SCHEMA_VERSION}">
  <evtServTom id="${eventUid}">
    <ideEvento>
      <indRetif>${indRetif}</indRetif>${retifTag}
      <perApur>${input.competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
    <infoServTom>
      <ideEstabObra>
        <tpInscEstab>1</tpInscEstab>
        <nrInscEstab>${cnpjEstab || '00000000000000'}</nrInscEstab>
        <indObra>${indObra}</indObra>
        <idePrestServ>
          <cnpjPrestador>${cnpjPrestador || '00000000000000'}</cnpjPrestador>
          <vlrTotalBruto>${round2(input.vlrBruto).toFixed(2)}</vlrTotalBruto>
          <vlrTotalBaseRet>${round2(input.vlrBaseRet).toFixed(2)}</vlrTotalBaseRet>
          <vlrTotalRetPrinc>${vlrRetencao.toFixed(2)}</vlrTotalRetPrinc>
          <indCPRB>${input.indCPRB}</indCPRB>
          <nfs>
            <serie>${sanitizeReinfText(input.serieNf || '0', 5) || '0'}</serie>
            <numDocto>${sanitizeReinfText(input.numDocto, 15) || 'SN'}</numDocto>
            <dtEmissaoNF>${input.dtEmissaoNF}</dtEmissaoNF>
            <vlrBruto>${round2(input.vlrBruto).toFixed(2)}</vlrBruto>
            <infoTpServ>
              <tpServico>${tpServico}</tpServico>
              <vlrBaseRet>${round2(input.vlrBaseRet).toFixed(2)}</vlrBaseRet>
              <vlrRetencao>${vlrRetencao.toFixed(2)}</vlrRetencao>
            </infoTpServ>
          </nfs>
        </idePrestServ>
      </ideEstabObra>
    </infoServTom>
  </evtServTom>
</Reinf>`;

  return {
    eventCode: 'R-2010',
    eventName: 'Retenção CP — Serviços Tomados',
    eventSeries: 'r2000',
    eventUid,
    competence: input.competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjPrestador,
    beneficiaryName: sanitizeReinfText(input.nomePrestador, 70) || 'Prestador de Serviço',
    natRend: tpServico,
    indRetif,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      cnpjPrestador,
      numDocto: input.numDocto,
      tpServico,
      indCPRB: input.indCPRB,
      aliquotaPercent: input.indCPRB === 1 ? 3.5 : 11,
      vlrBruto: round2(input.vlrBruto),
      vlrRetencao,
      crDctfWeb: indObra === 0 ? '114106' : '116201',
    },
    xmlContent,
    returnTotals: {
      r9001_base_cp: round2(input.vlrBaseRet),
      r9001_ret_cp: vlrRetencao,
    },
  };
}
