import type {
  Company,
  EsocialEmployerConfig,
  PayrollEntry,
} from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-1299 — Fechamento dos Eventos Periódicos (Consolidação S-5011, S-5012, S-5013 -> DCTFWeb)
 * Regras Anexo II: REGRA_VALIDA_FECHAMENTO_FOPAG
 */
export function buildEsocialS1299Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  competence: string;
  entriesForCompetence: PayrollEntry[];
  activeCltEmployeesCount: number;
  s1200Count: number;
  s1210Count: number;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const {
    company,
    config,
    competence,
    entriesForCompetence,
    activeCltEmployeesCount,
    s1200Count,
    s1210Count,
    sequence,
  } = params;

  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const cltEntries = entriesForCompetence.filter((e) => (e.contract_type || 'clt') === 'clt');
  const hasRemun = s1200Count > 0 || cltEntries.length > 0;
  const hasPgtos = s1210Count > 0 || cltEntries.length > 0;

  const warnings: string[] = [];
  if (s1200Count < activeCltEmployeesCount) {
    warnings.push(
      `REGRA_VALIDA_FECHAMENTO_FOPAG: Existem ${activeCltEmployeesCount} vínculos CLT ativos e ${s1200Count} evento(s) S-1200 gerados na competência ${competence}.`
    );
  }

  const totalCpSegurados = cltEntries.reduce((s, e) => s + Number(e.inss_amount || 0), 0);
  const totalCpPatronal = cltEntries.reduce((s, e) => s + Number(e.inss_patronal_amount || 0), 0);
  const totalBaseCp = cltEntries.reduce(
    (s, e) =>
      s +
      Math.max(
        0,
        Number(e.gross_salary || 0) -
          Number(e.vacation_abono_amount || 0) -
          Number(e.vacation_double_amount || 0)
      ),
    0
  );
  const gilratRate = (Number(config.aliq_rat || 2) * Number(config.fap || 1)) / 100;
  const totalGilrat = Math.round(totalBaseCp * gilratRate * 100) / 100;
  const totalIrrf = cltEntries.reduce((s, e) => s + Number(e.irrf_amount || 0), 0);
  const totalFgts = cltEntries.reduce((s, e) => s + Number(e.fgts_amount || 0), 0);

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtFechaEvPer/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtFechaEvPer Id="${eventUid}">
    <ideEvento>
      <indApuracao>1</indApuracao>
      <perApur>${competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <infoFech>
      <evtRemun>${hasRemun ? 'S' : 'N'}</evtRemun>
      <evtPgtos>${hasPgtos ? 'S' : 'N'}</evtPgtos>
      <evtComProd>N</evtComProd>
      <evtContratAvNP>N</evtContratAvNP>
      <evtInfoComplPer>N</evtInfoComplPer>
      <transDCTFWeb>${config.trans_dctfweb ? 'S' : 'N'}</transDCTFWeb>
      <naoValid>N</naoValid>
    </infoFech>
  </evtFechaEvPer>
</eSocial>`;

  return {
    eventCode: 'S-1299',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-1299'].name} (${competence})`,
    eventCategory: 'periodicos',
    eventUid,
    competence,
    employeeId: null,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: [],
    validationWarnings: warnings,
    payloadSummary: {
      perApur: competence,
      evtRemun: hasRemun ? 'S' : 'N',
      evtPgtos: hasPgtos ? 'S' : 'N',
      transDCTFWeb: config.trans_dctfweb ? 'S' : 'N',
      s5011InssTotal: Math.round((totalCpSegurados + totalCpPatronal + totalGilrat) * 100) / 100,
      s5012IrrfTotal: Math.round(totalIrrf * 100) / 100,
      s5013FgtsTotal: Math.round(totalFgts * 100) / 100,
    },
    xmlContent,
    returnTotals: {
      s5001_inss_segurado: Math.round(totalCpSegurados * 100) / 100,
      s5011_cp_patronal: Math.round(totalCpPatronal * 100) / 100,
      s5011_gilrat: totalGilrat,
      s5012_irrf_consolidado: Math.round(totalIrrf * 100) / 100,
      s5013_fgts_digital_total: Math.round(totalFgts * 100) / 100,
    },
  };
}
