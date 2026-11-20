import type { Company, ReinfContributorConfig, ReinfEventRecord } from '../../../types/database';
import { cleanDigits, generateReinfEventId, round2, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export function buildReinfR4099Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  competence: string;
  fechRet: 0 | 1;
  eventsForCompetence: ReinfEventRecord[];
  sequence?: number;
}): BuiltReinfEventDraft {
  const { company, config, competence, fechRet, eventsForCompetence, sequence = 99 } = params;
  const cnpj = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpj.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];

  const activeR4000 = eventsForCompetence.filter(
    (e) => e.competence === competence && e.status !== 'excluded' && e.event_series === 'r4000'
  );

  if (activeR4000.length === 0) {
    errors.push(
      'R-4099 campo 18: este evento só é aceito se houver ao menos um evento da série R-4000 (R-4010 a R-4080) no período.'
    );
  }
  if (cleanDigits(config.resp_cpf).length !== 11) {
    errors.push('CPF do responsável pelas informações (ideRespInf/cpfResp) inválido.');
  }

  const totalBaseIR = round2(
    activeR4000.reduce((s, e) => s + Number(e.return_totals?.r9005_base_ir || 0), 0)
  );
  const totalIR = round2(
    activeR4000.reduce((s, e) => s + Number(e.return_totals?.r9005_vlr_ir || 0), 0)
  );
  const totalCSLL = round2(
    activeR4000.reduce((s, e) => s + Number(e.return_totals?.r9005_vlr_csll || 0), 0)
  );
  const totalCofins = round2(
    activeR4000.reduce((s, e) => s + Number(e.return_totals?.r9005_vlr_cofins || 0), 0)
  );
  const totalPP = round2(
    activeR4000.reduce((s, e) => s + Number(e.return_totals?.r9005_vlr_pp || 0), 0)
  );
  const totalDctfRet = round2(totalIR + totalCSLL + totalCofins + totalPP);

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
<Reinf xmlns="${REINF_SCHEMA_BASE}/evt4099Fechamento/${REINF_SCHEMA_VERSION}">
  <evtFech id="${eventUid}">
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
      <fechRet>${fechRet}</fechRet>
    </infoFech>
  </evtFech>
</Reinf>`;

  return {
    eventCode: 'R-4099',
    eventName:
      fechRet === 0
        ? 'Fechamento Série R-4000 (Retenções Fonte)'
        : 'Reabertura Série R-4000 (Retenções Fonte)',
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
    validationWarnings: [],
    payloadSummary: {
      competence,
      fechRet: fechRet === 0 ? '0 - Fechamento' : '1 - Reabertura',
      eventosR4000: activeR4000.length,
      r9015DctfWebRet: fechRet === 0 ? totalDctfRet : 0,
    },
    xmlContent,
    returnTotals:
      fechRet === 0
        ? {
            r9005_base_ir: totalBaseIR,
            r9005_vlr_ir: totalIR,
            r9005_vlr_csll: totalCSLL,
            r9005_vlr_cofins: totalCofins,
            r9005_vlr_pp: totalPP,
            r9015_dctfweb_ret: totalDctfRet,
            ident_escrit_dctf: `REINF-RET-${competence.replace('-', '')}`,
          }
        : null,
  };
}
