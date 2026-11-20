import type {
  Company,
  Employee,
  EmployeeVacationRecord,
  EsocialEmployerConfig,
} from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG, ESOCIAL_TABELA_18_MOTIVOS_AFAST } from '../catalogs';
import { cleanDigits, deriveMatricula, generateEsocialEventId, sanitizeText } from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-2230 — Afastamento Temporário (Férias codMotAfast=15 com <perAquis> ou Licenças Tabela 18)
 * Regras Anexo II: REGRA_AFASTAMENTO, REGRA_VINCULO_ATIVO_NA_DTEVENTO
 */
export function buildEsocialS2230Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  employee: Employee;
  codMotAfast: string;
  dtIniAfast: string;
  dtTermAfast: string;
  perAquisStart?: string | null;
  perAquisEnd?: string | null;
  vacation?: EmployeeVacationRecord | null;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const {
    company,
    config,
    employee,
    codMotAfast,
    dtIniAfast,
    dtTermAfast,
    perAquisStart,
    perAquisEnd,
    vacation,
    sequence,
  } = params;

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
  const warnings: string[] = [];

  if (dtTermAfast < dtIniAfast) {
    errors.push('REGRA_AFASTAMENTO: Data de término (dtTermAfast) não pode ser anterior a dtIniAfast.');
  }
  if (codMotAfast === '15' && !perAquisStart && !vacation?.acquisitive_start) {
    warnings.push(
      'REGRA_AFASTAMENTO (S-2230): Para codMotAfast = 15 (Férias) de empregado CLT (1XX), o grupo <perAquis> é obrigatório.'
    );
  }

  const aquisIni = perAquisStart || vacation?.acquisitive_start || employee.hire_date || dtIniAfast;
  const aquisFim = perAquisEnd || vacation?.acquisitive_end || dtIniAfast;

  const perAquisXml =
    codMotAfast === '15'
      ? `        <perAquis>
          <dtInicio>${aquisIni}</dtInicio>
          <dtFim>${aquisFim}</dtFim>
        </perAquis>\n`
      : '';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAfastTemp/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtAfastTemp Id="${eventUid}">
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
    <infoAfastamento>
      <iniAfastamento>
        <dtIniAfast>${dtIniAfast}</dtIniAfast>
        <codMotAfast>${codMotAfast}</codMotAfast>
${perAquisXml}      </iniAfastamento>
      <fimAfastamento>
        <dtTermAfast>${dtTermAfast}</dtTermAfast>
      </fimAfastamento>
    </infoAfastamento>
  </evtAfastTemp>
</eSocial>`;

  const motivoLabel =
    ESOCIAL_TABELA_18_MOTIVOS_AFAST.find((m) => m.code === codMotAfast)?.label ||
    `Motivo ${codMotAfast}`;

  return {
    eventCode: 'S-2230',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-2230'].name} (${employee.full_name})`,
    eventCategory: 'nao_periodicos',
    eventUid,
    competence: dtIniAfast.slice(0, 7),
    employeeId: employee.id,
    payrollEntryId: vacation?.payroll_entry_id || null,
    vacationId: vacation?.id || null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      trabalhador: employee.full_name,
      matricula,
      codMotAfast,
      motivo: motivoLabel,
      dtIniAfast,
      dtTermAfast,
      perAquis: codMotAfast === '15' ? `${aquisIni} a ${aquisFim}` : null,
    },
    xmlContent,
    returnTotals: null,
  };
}
