import type { Company, Employee, EsocialEmployerConfig, Job } from '../../../types/database';
import { ESOCIAL_EVENT_CATALOG } from '../catalogs';
import {
  cleanDigits,
  deriveCbo,
  deriveMatricula,
  generateEsocialEventId,
  sanitizeText,
} from '../helpers';
import { ESOCIAL_S13_NAMESPACE_VERSION, type BuiltEsocialEventDraft } from '../types';

/**
 * Evento S-2206 — Alteração de Contrato de Trabalho/Relação Estatutária (Salário, Cargo, Jornada)
 * Regras Anexo II: REGRA_VINCULO_ATIVO_NA_DTEVENTO, REGRA_RETIFICA_MESMO_VINCULO
 */
export function buildEsocialS2206Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  employee: Employee;
  job?: Job;
  dtAlteracao: string;
  newSalary?: number;
  description?: string;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, employee, job, dtAlteracao, newSalary, description, sequence } = params;
  const cnpjFull = cleanDigits(company?.cnpj).padEnd(14, '0').slice(0, 14);
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cnpjFull.slice(0, 8)
  ).padEnd(8, '0');
  const cpfTrab = cleanDigits(employee.cpf, '00000000000').padEnd(11, '0').slice(0, 11);
  const matricula = deriveMatricula(employee);
  const salary = Number(newSalary ?? employee.salary_override ?? job?.base_salary ?? 0);
  const cbo = deriveCbo(job);

  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  if (employee.hire_date && dtAlteracao < employee.hire_date) {
    errors.push(
      `REGRA_VINCULO_ATIVO_NA_DTEVENTO: Data de efeito da alteração (${dtAlteracao}) não pode ser anterior à admissão (${employee.hire_date}).`
    );
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAltContratual/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtAltContratual Id="${eventUid}">
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
    <altContratual>
      <dtAlteracao>${dtAlteracao}</dtAlteracao>
      <dtEf>${dtAlteracao}</dtEf>
      <dscAlt>${sanitizeText(description || 'Alteracao salarial / enquadramento contratual', 150)}</dscAlt>
      <vinculo>
        <tpRegPrev>1</tpRegPrev>
        <infoRegimeTrab>
          <infoCeletista>
            <tpRegJor>1</tpRegJor>
            <natAtividade>1</natAtividade>
            <cnpjSindCategProf>${cleanDigits(config.cnpj_sind_default, '00000000000000').padEnd(14, '0').slice(0, 14)}</cnpjSindCategProf>
          </infoCeletista>
        </infoRegimeTrab>
        <infoContrato>
          <nmCargo>${sanitizeText(job?.title || 'Colaborador', 100)}</nmCargo>
          <CBOCargo>${cbo}</CBOCargo>
          <codCateg>101</codCateg>
          <remuneracao>
            <vrSalFx>${salary.toFixed(2)}</vrSalFx>
            <undSalFixo>5</undSalFixo>
          </remuneracao>
          <duracao>
            <tpContr>1</tpContr>
          </duracao>
          <localTrabalho>
            <localTrabGeral>
              <tpInsc>1</tpInsc>
              <nrInsc>${cnpjFull}</nrInsc>
            </localTrabGeral>
          </localTrabalho>
        </infoContrato>
      </vinculo>
    </altContratual>
  </evtAltContratual>
</eSocial>`;

  return {
    eventCode: 'S-2206',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-2206'].name} (${employee.full_name})`,
    eventCategory: 'nao_periodicos',
    eventUid,
    competence: dtAlteracao.slice(0, 7),
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
      dtAlteracao,
      novoSalario: salary,
      cargo: job?.title || 'Cargo',
      motivo: description || 'Alteração Salarial / Contratual',
    },
    xmlContent,
    returnTotals: null,
  };
}
