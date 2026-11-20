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
 * Evento S-2200 — Cadastramento Inicial do Vínculo e Admissão/Ingresso de Trabalhador (CLT Cat. 101)
 * Regras Anexo II: REGRA_COMPATIB_CATEG_EVENTO, REGRA_VALIDA_TRABALHADOR_BASE_CPF, REGRA_VALIDA_MATRICULA
 */
export function buildEsocialS2200Event(params: {
  company: Company | null;
  config: EsocialEmployerConfig;
  employee: Employee;
  job?: Job;
  sequence?: number;
}): BuiltEsocialEventDraft {
  const { company, config, employee, job, sequence } = params;
  const cnpjFull = cleanDigits(company?.cnpj).padEnd(14, '0').slice(0, 14);
  const cnpjRoot = (
    cleanDigits(company?.cnpj_root) || cnpjFull.slice(0, 8)
  ).padEnd(8, '0');
  const cpfTrab = cleanDigits(employee.cpf);
  const matricula = deriveMatricula(employee);
  const salary = Number(employee.salary_override ?? job?.base_salary ?? 0);
  const cbo = deriveCbo(job);
  const dtAdm = employee.hire_date || new Date().toISOString().slice(0, 10);

  const eventUid = generateEsocialEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot,
    sequence,
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  if (employee.contract_type === 'pj') {
    errors.push(
      'REGRA_COMPATIB_CATEG_EVENTO: Prestador PJ (B2B/NFS-e) não deve ser enviado via S-2200 (Vínculo CLT). Utilize EFD-Reinf Série R-4000 ou S-2300 (se Contribuinte Individual PF).'
    );
  }
  if (cpfTrab.length !== 11) {
    warnings.push(
      'REGRA_VALIDA_TRABALHADOR_BASE_CPF: CPF do trabalhador ausente ou incompleto no cadastro; utilizado preenchimento padrão para homologação.'
    );
  }
  if (!employee.personal_info?.birth_date) {
    warnings.push(
      'Data de nascimento não informada na ficha; utilizando data padrão para o grupo <nascimento>.'
    );
  }
  if (salary <= 0) {
    errors.push(
      'REGRA_REMUNERACAO: Salário contratual fixo (vrSalFx) deve ser maior que zero para undSalFixo = 5 (Mensal).'
    );
  }

  const dependentsXml = (employee.dependents_list || [])
    .map(
      (dep) => `      <dependente>
        <tpDep>${
          dep.relationship === 'Cônjuge / Companheiro(a)'
            ? '01'
            : dep.relationship === 'Filho(a) / Enteado(a)'
            ? '03'
            : dep.relationship === 'Pais / Avós'
            ? '09'
            : '99'
        }</tpDep>
        <nmDep>${sanitizeText(dep.full_name, 70)}</nmDep>
        <dtNascto>${dep.birth_date || '2015-01-01'}</dtNascto>
        <cpfDep>${cleanDigits(dep.cpf, '00000000191').padEnd(11, '0').slice(0, 11)}</cpfDep>
        <depIRRF>${dep.irrf_dependent ? 'S' : 'N'}</depIRRF>
        <depSF>N</depSF>
      </dependente>`
    )
    .join('\n');

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtAdmissao/${ESOCIAL_S13_NAMESPACE_VERSION}">
  <evtAdmissao Id="${eventUid}">
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
    <trabalhador>
      <cpfTrab>${(cpfTrab || '00000000000').padEnd(11, '0').slice(0, 11)}</cpfTrab>
      <nmTrab>${sanitizeText(employee.full_name, 70)}</nmTrab>
      <sexo>M</sexo>
      <racaCor>1</racaCor>
      <grauInstr>09</grauInstr>
      <nascimento>
        <dtNascto>${employee.personal_info?.birth_date || '1990-01-01'}</dtNascto>
        <paisNascto>105</paisNascto>
        <paisNac>105</paisNac>
      </nascimento>
      <endereco>
        <brasil>
          <tpLograd>R</tpLograd>
          <dscLograd>${sanitizeText(employee.address_info?.endereco || 'Rua Principal', 100)}</dscLograd>
          <nrLograd>${sanitizeText(employee.address_info?.numero || 'SN', 10)}</nrLograd>
          <bairro>${sanitizeText(employee.address_info?.bairro || 'Centro', 90)}</bairro>
          <cep>${cleanDigits(employee.address_info?.cep, '01001000').padEnd(8, '0').slice(0, 8)}</cep>
          <codMunic>3550308</codMunic>
          <uf>${sanitizeText(employee.address_info?.estado || 'SP', 2).toUpperCase()}</uf>
        </brasil>
      </endereco>
${dependentsXml ? `${dependentsXml}\n` : ''}    </trabalhador>
    <vinculo>
      <matricula>${matricula}</matricula>
      <tpRegTrab>1</tpRegTrab>
      <tpRegPrev>1</tpRegPrev>
      <cadIni>N</cadIni>
      <infoRegimeTrab>
        <infoCeletista>
          <dtAdm>${dtAdm}</dtAdm>
          <tpAdmissao>1</tpAdmissao>
          <indAdmissao>1</indAdmissao>
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
        <horContratual>
          <qtdHrsSem>44.00</qtdHrsSem>
          <tpJornada>4</tpJornada>
          <tmpParc>0</tmpParc>
          <horNoturno>N</horNoturno>
          <dscJorn>Segunda a Sexta das 08:00 as 18:00 com 01:12 de intervalo</dscJorn>
        </horContratual>
      </infoContrato>
    </vinculo>
  </evtAdmissao>
</eSocial>`;

  return {
    eventCode: 'S-2200',
    eventName: `${ESOCIAL_EVENT_CATALOG['S-2200'].name} (${employee.full_name})`,
    eventCategory: 'nao_periodicos',
    eventUid,
    competence: dtAdm.slice(0, 7),
    employeeId: employee.id,
    payrollEntryId: null,
    vacationId: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      trabalhador: employee.full_name,
      cpfTrab: cpfTrab || 'Não informado',
      matricula,
      codCateg: '101',
      dtAdm,
      cargo: job?.title || 'Cargo',
      cbo,
      vrSalFx: salary,
      dependentesIRRF: Number(employee.dependents_count || 0),
    },
    xmlContent,
    returnTotals: null,
  };
}
