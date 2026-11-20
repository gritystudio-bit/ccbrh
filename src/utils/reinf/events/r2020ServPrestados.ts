import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR2020Input {
  competence: string;
  cnpjTomador: string;
  nomeTomador: string;
  serieNf?: string;
  numDocto: string;
  dtEmissaoNF: string;
  vlrBruto: number;
  vlrBaseRet: number;
  aliquotaPercent?: 11 | 3.5;
  tpServico?: string;
  sequence?: number;
}

export function buildReinfR2020Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR2020Input;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const cnpjTomador = cleanDigits(input.cnpjTomador, '');
  const errors: string[] = [];

  if (cnpjEstab.length !== 14) {
    errors.push('Estabelecimento prestador sem CNPJ de 14 dígitos válido.');
  }
  if (cnpjTomador.length !== 14) {
    errors.push('REGRA_EVE_VALIDO_TOMAD: nrInscTomador deve possuir 14 dígitos válidos.');
  }
  if (!input.dtEmissaoNF.startsWith(input.competence)) {
    errors.push(`dtEmissaoNF (${input.dtEmissaoNF}) deve estar na competência ${input.competence}.`);
  }

  const rate = (input.aliquotaPercent ?? 11) / 100;
  const vlrRetencao = round2(input.vlrBaseRet * rate);
  const tpServico = cleanDigits(input.tpServico || config.default_tp_servico_cp, '100000028').slice(
    0,
    9
  );

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence: input.sequence ?? 11,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtPrestadorServicos/${REINF_SCHEMA_VERSION}">
  <evtServPrest id="${eventUid}">
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
    <infoServPrest>
      <ideEstabPrest>
        <tpInscEstab>1</tpInscEstab>
        <nrInscEstab>${cnpjEstab || '00000000000000'}</nrInscEstab>
        <ideTomador>
          <tpInscTomador>1</tpInscTomador>
          <nrInscTomador>${cnpjTomador || '00000000000000'}</nrInscTomador>
          <indObra>0</indObra>
          <vlrTotalBruto>${round2(input.vlrBruto).toFixed(2)}</vlrTotalBruto>
          <vlrTotalBaseRet>${round2(input.vlrBaseRet).toFixed(2)}</vlrTotalBaseRet>
          <vlrTotalRetPrinc>${vlrRetencao.toFixed(2)}</vlrTotalRetPrinc>
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
        </ideTomador>
      </ideEstabPrest>
    </infoServPrest>
  </evtServPrest>
</Reinf>`;

  return {
    eventCode: 'R-2020',
    eventName: 'Retenção CP — Serviços Prestados',
    eventSeries: 'r2000',
    eventUid,
    competence: input.competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjTomador,
    beneficiaryName: sanitizeReinfText(input.nomeTomador, 70) || 'Tomador de Serviço',
    natRend: tpServico,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      cnpjTomador,
      numDocto: input.numDocto,
      tpServico,
      vlrBruto: round2(input.vlrBruto),
      vlrRetencaoSofrendoDesconto: vlrRetencao,
    },
    xmlContent,
    returnTotals: {
      r9001_base_cp: round2(input.vlrBaseRet),
    },
  };
}
