import type { Company, EsocialEmployerConfig } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import {
  cleanDigits,
  generateEsocialEventId,
  sanitizeText,
  validateEsocialEventId,
} from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-1000 — Informações do Empregador/Contribuinte/Órgão Público
 * Regras Anexo II: REGRA_VALIDA_ID_EVENTO, REGRA_VALIDA_EMPREGADOR, REGRA_INFO_EMP_VALIDA_DTINICIAL
 */
export function buildEsocialS1000Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  iniValid: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, iniValid, sequence } = params;
  const cnpjFull = cleanDigits(company?.cnpj);
  const cnpjRoot = cleanDigits(company?.cnpj_root) || cnpjFull.slice(0, 8);
  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!validateEsocialEventId(eventUid)) {
    errors.push('REGRA_VALIDA_ID_EVENTO: Id do evento não possui 36 posições válidas.');
  }
  if (cnpjRoot.length !== 8) {
    errors.push('REGRA_VALIDA_EMPREGADOR: Raiz de CNPJ do empregador (nrInsc) deve conter 8 algarismos.');
  }
  if (!/^\d{4}-\d{2}$/.test(iniValid)) {
    errors.push('REGRA_INFO_EMP_VALIDA_DTINICIAL: Período iniValid deve estar no formato AAAA-MM.');
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtInfoEmpregador/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtInfoEmpregador Id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideEmpregador>
    <infoEmpregador>
      <inclusao>
        <idePeriodo>
          <iniValid>${iniValid}</iniValid>
        </idePeriodo>
        <infoCadastro>
          <classTrib>${config.class_trib}</classTrib>
          <indCoop>${config.ind_coop}</indCoop>
          <indConstr>${config.ind_constr}</indConstr>
          <indDesFolha>${config.ind_des_folha}</indDesFolha>
        </infoCadastro>
      </inclusao>
    </infoEmpregador>
  </evtInfoEmpregador>
</eSocial>`;

  return {
    eventCode: 'S-1000',
    eventName: ESOCIAL_EVENT_CATALOG['S-1000'].name,
    eventCategory: 'tabelas',
    eventUid,
    competence: iniValid,
    employeeId: null,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      empregador: company?.name || 'Empresa',
      cnpjRaiz: cnpjRoot || '00000000',
      classTrib: config.class_trib,
      iniValid,
      indDesFolha: config.ind_des_folha,
    },
    xmlContent,
    returnTotals: null,
  };
}
