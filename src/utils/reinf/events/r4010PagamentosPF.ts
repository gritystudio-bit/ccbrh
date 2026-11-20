import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR4010Input {
  competence: string;
  cpfBenef: string;
  nomeBenef: string;
  natRend: string;
  dtFG: string;
  vlrRendBruto: number;
  vlrRendTrib: number;
  vlrIR: number;
  deducaoPrevidenciaOuSimplif?: number;
  indTpDeducao?: 1 | 5 | 7 | 8;
  observ?: string;
  indRetif?: 1 | 2;
  nrRecibo?: string;
  sequence?: number;
}

export function buildReinfR4010Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR4010Input;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const cpfBenef = cleanDigits(input.cpfBenef, '');
  const errors: string[] = [];
  const warnings: string[] = [];

  if (cnpjEstab.length !== 14) {
    errors.push('CNPJ do estabelecimento pagador (ideEstab/nrInscEstab) inválido.');
  }
  if (cpfBenef.length !== 11) {
    errors.push('REGRA_VALIDA_BENEF: cpfBenef do beneficiário Pessoa Física deve possuir 11 dígitos.');
  }
  if (input.natRend !== '12001' && !input.dtFG.startsWith(input.competence)) {
    errors.push(`dtFG (${input.dtFG}) deve pertencer ao período de apuração ${input.competence}.`);
  }
  if (input.vlrRendBruto <= 0) {
    errors.push('vlrRendBruto deve ser maior que zero.');
  }
  if (input.natRend === '12001' && input.vlrIR > 0) {
    warnings.push('Lucros e Dividendos (natRend 12001): verificar isenção legal quando aplicável.');
  }

  const indRetif = input.indRetif ?? 1;
  const retifTag =
    indRetif === 2 && input.nrRecibo
      ? `\n      <nrRecibo>${sanitizeReinfText(input.nrRecibo, 52)}</nrRecibo>`
      : '';

  const deducao = round2(Math.max(0, input.deducaoPrevidenciaOuSimplif ?? 0));
  const detDedTag =
    deducao > 0
      ? `\n              <detDed>
                <indTpDeducao>${input.indTpDeducao ?? 8}</indTpDeducao>
                <vlrDeducao>${deducao.toFixed(2)}</vlrDeducao>
              </detDed>`
      : '';

  const rendIsentoTag =
    input.natRend === '12001'
      ? `\n              <rendIsento>
                <tpIsencao>5</tpIsencao>
                <vlrIsento>${round2(input.vlrRendBruto).toFixed(2)}</vlrIsento>
              </rendIsento>`
      : '';

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence: input.sequence ?? 41,
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtRetPF/${REINF_SCHEMA_VERSION}">
  <evtRetPF id="${eventUid}">
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
    <ideEstab>
      <tpInscEstab>1</tpInscEstab>
      <nrInscEstab>${cnpjEstab || '00000000000000'}</nrInscEstab>
      <ideBenef>
        <cpfBenef>${cpfBenef || '00000000000'}</cpfBenef>
        <idePgto>
          <natRend>${cleanDigits(input.natRend, '13002').slice(0, 5)}</natRend>
          <observ>${sanitizeReinfText(input.observ || 'Pagamento PF via CCBRH', 200)}</observ>
          <infoPgto>
            <dtFG>${input.dtFG}</dtFG>
            <vlrRendBruto>${round2(input.vlrRendBruto).toFixed(2)}</vlrRendBruto>
            <vlrRendTrib>${round2(input.vlrRendTrib).toFixed(2)}</vlrRendTrib>
            <vlrIR>${round2(input.vlrIR).toFixed(2)}</vlrIR>${detDedTag}${rendIsentoTag}
          </infoPgto>
        </idePgto>
      </ideBenef>
    </ideEstab>
  </evtRetPF>
</Reinf>`;

  return {
    eventCode: 'R-4010',
    eventName: 'Pagamentos/Créditos a Pessoa Física',
    eventSeries: 'r4000',
    eventUid,
    competence: input.competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cpfBenef,
    beneficiaryName: sanitizeReinfText(input.nomeBenef, 70) || 'Beneficiário PF',
    natRend: cleanDigits(input.natRend, '13002').slice(0, 5),
    indRetif,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      cpfBenef,
      natRend: cleanDigits(input.natRend, '13002').slice(0, 5),
      dtFG: input.dtFG,
      vlrRendBruto: round2(input.vlrRendBruto),
      vlrRendTrib: round2(input.vlrRendTrib),
      vlrIR: round2(input.vlrIR),
      crDctfWeb: input.natRend === '13002' ? '320806' : input.natRend === '12001' ? 'ISENTO' : '058806',
    },
    xmlContent,
    returnTotals: {
      r9005_base_ir: round2(input.vlrRendTrib),
      r9005_vlr_ir: round2(input.vlrIR),
      r9015_dctfweb_ret: round2(input.vlrIR),
    },
  };
}
