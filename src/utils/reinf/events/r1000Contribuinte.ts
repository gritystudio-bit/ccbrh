import type { Company, ReinfContributorConfig } from '../../../types/database';
import { cleanDigits, generateReinfEventId, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export function buildReinfR1000Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  iniValid?: string;
  indRetif?: 1 | 2;
  sequence?: number;
}): BuiltReinfEventDraft {
  const { company, config, iniValid = '2026-01', indRetif = 1, sequence = 1 } = params;
  const cnpj = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpj.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (cnpjRoot.length !== 8) {
    errors.push('REGRA_VALIDA_CONTRIBUINTE: CNPJ raiz (8 posições) ausente ou inválido na empresa.');
  }
  if (!config.class_trib) {
    errors.push('classTrib obrigatório conforme Tabela 08 da EFD-Reinf v2.1.2b.');
  }
  if (config.ind_desoneracao === 1 && !['02', '03', '99'].includes(config.class_trib)) {
    errors.push('indDesoneracao = 1 permitido apenas para classTrib 02, 03 ou 99 (Lei 12.546/2011).');
  }
  if (cleanDigits(config.contato_cpf).length !== 11 || config.contato_cpf === '00000000000') {
    warnings.push('Informe um CPF válido para o contato fiscal (contato/cpfCtt) antes do envio em Produção.');
  }

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence,
  });

  const contatoNome = sanitizeReinfText(config.contato_nome, 70) || 'Responsavel Fiscal';
  const contatoCpf = cleanDigits(config.contato_cpf, '00000000000').slice(0, 11).padStart(11, '0');
  const contatoFone = cleanDigits(config.contato_fone, '1130000000').slice(0, 13);
  const contatoEmail = sanitizeReinfText(config.contato_email, 60) || 'fiscal@ccbrh.com.br';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtInfoContribuinte/${REINF_SCHEMA_VERSION}">
  <evtInfoContri id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
    <infoContri>
      <inclusao>
        <idePeriodo>
          <iniValid>${iniValid}</iniValid>
        </idePeriodo>
        <infoCadastro>
          <classTrib>${config.class_trib}</classTrib>
          <indEscrituracao>${config.ind_escrituracao}</indEscrituracao>
          <indDesoneracao>${config.ind_desoneracao}</indDesoneracao>
          <indAcordoIsenMulta>${config.ind_acordo_isen_multa}</indAcordoIsenMulta>
          <indSitPJ>${config.ind_sit_pj}</indSitPJ>
          <contato>
            <nmCtt>${contatoNome}</nmCtt>
            <cpfCtt>${contatoCpf}</cpfCtt>
            <foneFixo>${contatoFone}</foneFixo>
            <email>${contatoEmail}</email>
          </contato>
        </infoCadastro>
      </inclusao>
    </infoContri>
  </evtInfoContri>
</Reinf>`;

  return {
    eventCode: 'R-1000',
    eventName: 'Informações do Contribuinte',
    eventSeries: 'tabelas',
    eventUid,
    competence: iniValid,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjRoot || cnpj,
    beneficiaryName: company.name,
    natRend: null,
    indRetif,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: warnings,
    payloadSummary: {
      classTrib: config.class_trib,
      indEscrituracao: config.ind_escrituracao,
      indDesoneracao: config.ind_desoneracao,
      iniValid,
    },
    xmlContent,
    returnTotals: null,
  };
}
