import type { Company, Employee, EsocialEmployerConfig } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import { cleanDigits, deriveMatricula, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-2299 — Desligamento (Rescisão Contratual CLT · Tabela 19 do Anexo I)
 * Regras Anexo II: REGRA_VINCULO_ATIVO_NA_DTEVENTO, REGRA_DESLIG_TRABALHADOR_AFASTADO
 */
export function buildEsocialS2299Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  employee: Employee;
  mtvDeslig?: string;
  dtDeslig?: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, employee, sequence } = params;
  const mtvDeslig = params.mtvDeslig || '02';
  const dtDeslig =
    params.dtDeslig || employee.resignation_date || new Date().toISOString().slice(0, 10);
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cleanDigits(company?.cnpj).slice(0, 8)
  ).padEnd(8, '0');
  const cpfTrab = cleanDigits(employee.cpf, '00000000000').padEnd(11, '0').slice(0, 11);
  const matricula = deriveMatricula(employee);

  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  if (employee.hire_date && dtDeslig < employee.hire_date) {
    errors.push(
      'REGRA_VINCULO_ATIVO_NA_DTEVENTO: Data de desligamento não pode ser anterior à data de admissão.'
    );
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtDeslig/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtDeslig Id="${eventUid}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>${cpfTrab}</cpfTrab>
      <matricula>${matricula}</matricula>
    </ideVinculo>
    <infoDeslig>
      <mtvDeslig>${mtvDeslig}</mtvDeslig>
      <dtDeslig>${dtDeslig}</dtDeslig>
      <indPagtoAPI>N</indPagtoAPI>
    </infoDeslig>
  </evtDeslig>
</eSocial>`;

  return {
    eventCode: 'S-2299',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-2299'].name} (${employee.full_name})`,
    eventCategory: 'nao_periodicos',
    eventUid,
    competence: dtDeslig.slice(0, 7),
    employeeId: employee.id,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      trabalhador: employee.full_name,
      matricula,
      mtvDeslig,
      dtDeslig,
    },
    xmlContent,
    returnTotals: null,
  };
}
