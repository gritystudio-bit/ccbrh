import type { Company, ReinfContributorConfig, ReinfEventRecord } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export function buildReinfR2099Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  competence: string;
  eventsForCompetence: ReinfEventRecord[];
  sequence?: number;
}): BuiltReinfEventDraft {
  const { company, config, competence, eventsForCompetence, sequence = 99 } = params;
  const cnpj = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpj.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];

  const activeR2000 = eventsForCompetence.filter(
    (e) => e.competence === competence && e.status !== 'excluded' && e.event_series === 'r2000'
  );
  const hasServTom = activeR2000.some((e) => e.event_code === 'R-2010');
  const hasServPrest = activeR2000.some((e) => e.event_code === 'R-2020');
  const hasCprb = activeR2000.some((e) => e.event_code === 'R-2060');

  if (cleanDigits(config.resp_cpf).length !== 11) {
    errors.push('CPF do responsável pelo fechamento (ideRespInf/cpfResp) inválido.');
  }

  const totalRetCp = round2(
    activeR2000.reduce((s, e) => s + Number(e.return_totals?.r9001_ret_cp || 0), 0)
  );
  const totalCprb = round2(
    activeR2000.reduce((s, e) => s + Number(e.return_totals?.r9001_cprb || 0), 0)
  );
  const totalDctfCp = round2(totalRetCp + totalCprb);

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence,
  });

  const respNome = sanitizeReinfText(config.resp_nome, 70) || 'Contador Responsavel';
  const respCpf = cleanDigits(config.resp_cpf, '00000000000').slice(0, 11).padStart(11, '0');
  const fone = cleanDigits(config.contato_fone, '1130000000').slice(0, 13);
  const email = sanitizeReinfText(config.contato_email, 60) || 'fiscal@ccbrh.com.br';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtFechamento/${REINF_SCHEMA_VERSION}">
  <evtFechaEvPer id="${eventUid}">
    <ideEvento>
      <perApur>${competence}</perApur>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
    <ideRespInf>
      <nmResp>${respNome}</nmResp>
      <cpfResp>${respCpf}</cpfResp>
      <telefone>${fone}</telefone>
      <email>${email}</email>
    </ideRespInf>
    <infoFech>
      <evtServTm>${hasServTom ? 'S' : 'N'}</evtServTm>
      <evtServPr>${hasServPrest ? 'S' : 'N'}</evtServPr>
      <evtAssDespRec>N</evtAssDespRec>
      <evtAssDespRep>N</evtAssDespRep>
      <evtComProd>N</evtComProd>
      <evtCPRB>${hasCprb ? 'S' : 'N'}</evtCPRB>
      <evtAquis>N</evtAquis>
    </infoFech>
  </evtFechaEvPer>
</Reinf>`;

  return {
    eventCode: 'R-2099',
    eventName: 'Fechamento da Série R-2000',
    eventSeries: 'controle',
    eventUid,
    competence,
    employeeId: null,
    payrollEntryId: null,
    beneficiaryDoc: cnpjRoot || cnpj,
    beneficiaryName: company.name,
    natRend: null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings:
      activeR2000.length === 0
        ? ['Fechamento R-2099 sem movimento na série R-2000 (desnecessário se não houver R-4000 nem DCTFWeb).']
        : [],
    payloadSummary: {
      competence,
      evtServTm: hasServTom ? 'S' : 'N',
      evtServPr: hasServPrest ? 'S' : 'N',
      evtCPRB: hasCprb ? 'S' : 'N',
      r9011DctfWebCp: totalDctfCp,
    },
    xmlContent,
    returnTotals: {
      r9001_ret_cp: totalRetCp,
      r9001_cprb: totalCprb,
      r9011_dctfweb_cp: totalDctfCp,
      ident_escrit_dctf: `REINF-CP-${competence.replace('-', '')}`,
    },
  };
}
