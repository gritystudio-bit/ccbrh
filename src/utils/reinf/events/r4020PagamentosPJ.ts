import type {
  Company,
  Employee,
  PayrollEntry,
  ReinfContributorConfig,
} from '../../../types/database';
import {
  cleanDigits,
  generateReinfEventId,
  round2,
  sanitizeReinfText,
  splitPjRetentionBreakdown,
} from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export interface ReinfR4020ManualInput {
  competence: string;
  cnpjBenef: string;
  nomeBenef: string;
  natRend: string;
  dtFG: string;
  vlrBruto: number;
  vlrIR: number;
  vlrCSLL: number;
  vlrCofins: number;
  vlrPP: number;
  observ?: string;
  indRetif?: 1 | 2;
  nrRecibo?: string;
  sequence?: number;
}

function renderR4020XmlAndDraft(params: {
  company: Company;
  config: ReinfContributorConfig;
  competence: string;
  cnpjBenef: string;
  nomeBenef: string;
  natRend: string;
  dtFG: string;
  vlrBruto: number;
  vlrBaseIR: number;
  vlrIR: number;
  vlrBaseCSLL: number;
  vlrCSLL: number;
  vlrBaseCofins: number;
  vlrCofins: number;
  vlrBasePP: number;
  vlrPP: number;
  observ: string;
  employeeId: string | null;
  payrollEntryId: string | null;
  indRetif: 1 | 2;
  nrRecibo?: string;
  sequence: number;
}): BuiltReinfEventDraft {
  const {
    company,
    config,
    competence,
    cnpjBenef,
    nomeBenef,
    natRend,
    dtFG,
    vlrBruto,
    vlrBaseIR,
    vlrIR,
    vlrBaseCSLL,
    vlrCSLL,
    vlrBaseCofins,
    vlrCofins,
    vlrBasePP,
    vlrPP,
    observ,
    employeeId,
    payrollEntryId,
    indRetif,
    nrRecibo,
    sequence,
  } = params;

  const cnpjEstab = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpjEstab.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (cnpjEstab.length !== 14) {
    errors.push('CNPJ do estabelecimento declarante (ideEstab/nrInscEstab) inválido.');
  }
  if (cnpjBenef.length !== 14) {
    errors.push(
      `REGRA_VALIDA_BENEF: CNPJ do prestador PJ "${nomeBenef}" ausente ou inválido (14 dígitos).`
    );
  } else if (cnpjBenef === cnpjEstab) {
    errors.push('cnpjBenef em R-4020 não pode ser igual ao CNPJ do declarante.');
  }
  if (natRend !== '12001' && !dtFG.startsWith(competence)) {
    errors.push(`dtFG (${dtFG}) deve estar dentro da competência ${competence}.`);
  }
  if (vlrBruto <= 0) {
    errors.push('vlrBruto em R-4020 deve ser maior que zero.');
  }
  if (vlrIR === 0 && vlrCSLL === 0 && vlrCofins === 0 && vlrPP === 0) {
    warnings.push(
      'R-4020 sem retenções na fonte destacadas (verifique dispensa por valor mínimo ou Simples Nacional).'
    );
  }

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence,
  });

  const retifTag =
    indRetif === 2 && nrRecibo
      ? `\n      <nrRecibo>${sanitizeReinfText(nrRecibo, 52)}</nrRecibo>`
      : '';

  const retencoesTags: string[] = [];
  if (vlrIR > 0) {
    retencoesTags.push(`<vlrBaseIR>${round2(vlrBaseIR).toFixed(2)}</vlrBaseIR>`);
    retencoesTags.push(`<vlrIR>${round2(vlrIR).toFixed(2)}</vlrIR>`);
  }
  if (vlrCSLL > 0) {
    retencoesTags.push(`<vlrBaseCSLL>${round2(vlrBaseCSLL).toFixed(2)}</vlrBaseCSLL>`);
    retencoesTags.push(`<vlrCSLL>${round2(vlrCSLL).toFixed(2)}</vlrCSLL>`);
  }
  if (vlrCofins > 0) {
    retencoesTags.push(`<vlrBaseCofins>${round2(vlrBaseCofins).toFixed(2)}</vlrBaseCofins>`);
    retencoesTags.push(`<vlrCofins>${round2(vlrCofins).toFixed(2)}</vlrCofins>`);
  }
  if (vlrPP > 0) {
    retencoesTags.push(`<vlrBasePP>${round2(vlrBasePP).toFixed(2)}</vlrBasePP>`);
    retencoesTags.push(`<vlrPP>${round2(vlrPP).toFixed(2)}</vlrPP>`);
  }

  const retencoesBlock =
    retencoesTags.length > 0
      ? `\n            <retencoes>\n              ${retencoesTags.join(
          '\n              '
        )}\n            </retencoes>`
      : '';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtRetPJ/${REINF_SCHEMA_VERSION}">
  <evtRetPJ id="${eventUid}">
    <ideEvento>
      <indRetif>${indRetif}</indRetif>${retifTag}
      <perApur>${competence}</perApur>
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
        <cnpjBenef>${cnpjBenef || '00000000000000'}</cnpjBenef>
        <idePgto>
          <natRend>${cleanDigits(natRend, '15014').slice(0, 5)}</natRend>
          <observ>${sanitizeReinfText(observ, 200)}</observ>
          <infoPgto>
            <dtFG>${dtFG}</dtFG>
            <vlrBruto>${round2(vlrBruto).toFixed(2)}</vlrBruto>
            <observ>${sanitizeReinfText(observ, 200)}</observ>${retencoesBlock}
          </infoPgto>
        </idePgto>
      </ideBenef>
    </ideEstab>
  </evtRetPJ>
</Reinf>`;

  const totalRet = round2(vlrIR + vlrCSLL + vlrCofins + vlrPP);

  return {
    eventCode: 'R-4020',
    eventName: 'Pagamentos/Créditos a Pessoa Jurídica',
    eventSeries: 'r4000',
    eventUid,
    competence,
    employeeId,
    payrollEntryId,
    beneficiaryDoc: cnpjBenef,
    beneficiaryName: sanitizeReinfText(nomeBenef, 70) || 'Prestador PJ',
    natRend: cleanDigits(natRend, '15014').slice(0, 5),
    indRetif,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      cnpjBenef,
      natRend: cleanDigits(natRend, '15014').slice(0, 5),
      dtFG,
      vlrBruto: round2(vlrBruto),
      vlrIR: round2(vlrIR),
      vlrCSLL: round2(vlrCSLL),
      vlrCofins: round2(vlrCofins),
      vlrPP: round2(vlrPP),
      totalRetidoFonte: totalRet,
      crIRRF: vlrIR > 0 ? '170806' : 'N/A',
      crCSRF: vlrCSLL + vlrCofins + vlrPP > 0 ? '595207' : 'N/A',
    },
    xmlContent,
    returnTotals: {
      r9005_base_ir: round2(vlrBaseIR),
      r9005_vlr_ir: round2(vlrIR),
      r9005_vlr_csll: round2(vlrCSLL),
      r9005_vlr_cofins: round2(vlrCofins),
      r9005_vlr_pp: round2(vlrPP),
      r9015_dctfweb_ret: totalRet,
    },
  };
}

export function buildReinfR4020FromPjPayrollEntry(params: {
  company: Company;
  config: ReinfContributorConfig;
  employee: Employee;
  entry: PayrollEntry;
  natRend?: string;
  indRetif?: 1 | 2;
  nrRecibo?: string;
  sequence?: number;
}): BuiltReinfEventDraft {
  const { company, config, employee, entry, natRend, indRetif = 1, nrRecibo, sequence = 42 } = params;
  const cnpjBenef = cleanDigits(employee.pj_cnpj, '');
  const nomeBenef = employee.pj_company_name || employee.full_name;
  const dtFG = entry.nfse_issued_at
    ? entry.nfse_issued_at.slice(0, 10)
    : `${entry.competence}-20`;
  const gross = round2(Number(entry.gross_salary || 0));
  const totalRet = round2(Number(entry.pj_retention_amount || 0));
  const split = splitPjRetentionBreakdown(gross, totalRet);
  const nfRef = entry.nfse_number ? `NFS-e ${entry.nfse_number}` : 'Contrato PJ Folha';

  return renderR4020XmlAndDraft({
    company,
    config,
    competence: entry.competence,
    cnpjBenef,
    nomeBenef,
    natRend: natRend || config.default_nat_rend_pj || '15014',
    dtFG,
    vlrBruto: gross,
    vlrBaseIR: split.vlrBaseIR,
    vlrIR: split.vlrIR,
    vlrBaseCSLL: split.vlrBaseCSLL,
    vlrCSLL: split.vlrCSLL,
    vlrBaseCofins: split.vlrBaseCofins,
    vlrCofins: split.vlrCofins,
    vlrBasePP: split.vlrBasePP,
    vlrPP: split.vlrPP,
    observ: `${nfRef} · Prestador ${nomeBenef}`,
    employeeId: employee.id,
    payrollEntryId: entry.id,
    indRetif,
    nrRecibo,
    sequence,
  });
}

export function buildReinfR4020ManualEvent(params: {
  company: Company;
  config: ReinfContributorConfig;
  input: ReinfR4020ManualInput;
}): BuiltReinfEventDraft {
  const { company, config, input } = params;
  const cnpjBenef = cleanDigits(input.cnpjBenef, '');
  const gross = round2(input.vlrBruto);
  return renderR4020XmlAndDraft({
    company,
    config,
    competence: input.competence,
    cnpjBenef,
    nomeBenef: input.nomeBenef,
    natRend: input.natRend || '15014',
    dtFG: input.dtFG,
    vlrBruto: gross,
    vlrBaseIR: input.vlrIR > 0 ? gross : 0,
    vlrIR: round2(input.vlrIR),
    vlrBaseCSLL: input.vlrCSLL > 0 ? gross : 0,
    vlrCSLL: round2(input.vlrCSLL),
    vlrBaseCofins: input.vlrCofins > 0 ? gross : 0,
    vlrCofins: round2(input.vlrCofins),
    vlrBasePP: input.vlrPP > 0 ? gross : 0,
    vlrPP: round2(input.vlrPP),
    observ: input.observ || 'Lançamento R-4020 CCBRH',
    employeeId: null,
    payrollEntryId: null,
    indRetif: input.indRetif ?? 1,
    nrRecibo: input.nrRecibo,
    sequence: input.sequence ?? 43,
  });
}
