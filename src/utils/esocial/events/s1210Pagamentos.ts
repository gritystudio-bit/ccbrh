import type {
  Company,
  Employee,
  EsocialEmployerConfig,
  PayrollEntry,
  PayrollParameters,
} from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, deriveMatricula, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-1210 — Pagamentos de Rendimentos do Trabalho (Versão S-1.3 obrigatória desde 01/2025)
 * Inclui grupo <infoIRComplem> (Substituição da DIRF) e Código de Receita 056107
 * Gera o retorno S-5002 (Imposto de Renda Retido na Fonte por Trabalhador - Lei 15.270/2025)
 */
export function buildEsocialS1210Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  employee: Employee;
  entry: PayrollEntry;
  payrollParameters: PayrollParameters;
  dtPgto?: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, employee, entry, payrollParameters, sequence } = params;
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const cpfBenef = cleanDigits(employee.cpf, '00000000000').padEnd(11, '0').slice(0, 11);
  const matricula = deriveMatricula(employee);
  const ideDmDev = `DM-${entry.competence.replace('-', '')}-${matricula}`;
  const dtPgto = params.dtPgto || `${entry.competence}-28`;
  const vrLiq = Math.max(0, Number(entry.net_salary || 0));
  const irrfAmount = Number(entry.irrf_amount || 0);
  const healthDiscount = Number(entry.other_discounts || 0);

  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  if (vrLiq < 0) {
    errors.push(
      'REGRA_DESCONTO_IRRF_POSITIVO: O valor líquido pago (vrLiq) em S-1210 não pode ser negativo.'
    );
  }

  const planSaudeXml =
    healthDiscount > 0
      ? `      <planSaude>
        <cnpjOper>00000000000191</cnpjOper>
        <regANS>301949</regANS>
        <vlrSaudeTit>${healthDiscount.toFixed(2)}</vlrSaudeTit>
      </planSaude>\n`
      : '';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtPgtos/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtPgtos Id="${eventUid}">
    <ideEvento>
      <indRetif>1</indRetif>
      <perApur>${entry.competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <ideBenef>
      <cpfBenef>${cpfBenef}</cpfBenef>
      <infoPgto>
        <dtPgto>${dtPgto}</dtPgto>
        <tpPgto>1</tpPgto>
        <perRef>${entry.competence}</perRef>
        <ideDmDev>${ideDmDev}</ideDmDev>
        <vrLiq>${vrLiq.toFixed(2)}</vrLiq>
      </infoPgto>
      <infoIRComplem>
        <infoIRCR>
          <tpCR>056107</tpCR>
        </infoIRCR>
${planSaudeXml}      </infoIRComplem>
    </ideBenef>
  </evtPgtos>
</eSocial>`;

  const baseIrrf = Math.max(
    0,
    Number(entry.gross_salary || 0) -
      Number(entry.vacation_abono_amount || 0) -
      Number(entry.vacation_double_amount || 0) -
      Number(entry.inss_amount || 0)
  );

  return {
    eventCode: 'S-1210',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-1210'].name} (${employee.full_name})`,
    eventCategory: 'periodicos',
    eventUid,
    competence: entry.competence,
    employeeId: employee.id,
    payrollEntryId: entry.id,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      beneficiario: employee.full_name,
      cpfBenef,
      perApur: entry.competence,
      dtPgto,
      ideDmDev,
      tpCR: '056107',
      vrLiq,
      irrfRetido: irrfAmount,
      lei15270Isento: payrollParameters.apply_lei_15270 && irrfAmount === 0,
    },
    xmlContent,
    returnTotals: {
      s5002_base_irrf: baseIrrf,
      s5002_irrf_retido: irrfAmount,
      s5002_lei15270_isento: payrollParameters.apply_lei_15270 && irrfAmount === 0,
    },
  };
}
