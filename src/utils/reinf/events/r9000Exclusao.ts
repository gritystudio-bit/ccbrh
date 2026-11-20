import type { Company, ReinfContributorConfig, ReinfEventRecord } from '../../../types/database';
import { cleanDigits, generateReinfEventId, sanitizeReinfText } from '../helpers';
import { REINF_SCHEMA_BASE, REINF_SCHEMA_VERSION, type BuiltReinfEventDraft } from '../types';

export function buildReinfR9000Event(params: {
  company: Company;
  config: ReinfContributorConfig;
  targetEvent: ReinfEventRecord;
  sequence?: number;
}): BuiltReinfEventDraft {
  const { company, config, targetEvent, sequence = 900 } = params;
  const cnpj = cleanDigits(company.cnpj, '');
  const cnpjRoot = (cleanDigits(company.cnpj_root, '') || cnpj.slice(0, 8)).slice(0, 8);
  const errors: string[] = [];

  if (!targetEvent.receipt_number) {
    errors.push('REGRA_EVE_PERMITE_EXCLUSAO: evento selecionado não possui recibo de entrega válido.');
  }
  if (!['R-2010', 'R-2020', 'R-2060', 'R-4010', 'R-4020', 'R-4040', 'R-4080'].includes(targetEvent.event_code)) {
    errors.push(`Evento ${targetEvent.event_code} não é passível de exclusão direta pelo R-9000.`);
  }

  const eventUid = generateReinfEventId({
    tpInsc: 1,
    nrInsc: cnpjRoot || '00000000',
    sequence,
  });

  const perApur = targetEvent.competence || '2026-11';

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Reinf xmlns="${REINF_SCHEMA_BASE}/evtExclusao/${REINF_SCHEMA_VERSION}">
  <evtExclusao id="${eventUid}">
    <ideEvento>
      <tpAmb>${config.tp_amb}</tpAmb>
      <procEmi>${config.proc_emi}</procEmi>
      <verProc>${sanitizeReinfText(config.ver_proc, 20)}</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>
      <nrInsc>${cnpjRoot || '00000000'}</nrInsc>
    </ideContri>
    <infoExclusao>
      <tpEvento>${targetEvent.event_code}</tpEvento>
      <nrRecEvt>${targetEvent.receipt_number || 'PENDENTE'}</nrRecEvt>
      <perApur>${perApur}</perApur>
    </infoExclusao>
  </evtExclusao>
</Reinf>`;

  return {
    eventCode: 'R-9000',
    eventName: `Exclusão de ${targetEvent.event_code}`,
    eventSeries: 'controle',
    eventUid,
    competence: perApur,
    employeeId: targetEvent.employee_id || null,
    payrollEntryId: targetEvent.payroll_entry_id || null,
    beneficiaryDoc: targetEvent.beneficiary_doc || null,
    beneficiaryName: targetEvent.beneficiary_name || null,
    natRend: targetEvent.nat_rend || null,
    indRetif: 1,
    tpAmb: config.tp_amb,
    validationErrors: errors,
    validationWarnings: [],
    payloadSummary: {
      tpEvento: targetEvent.event_code,
      nrRecEvt: targetEvent.receipt_number || null,
      perApur,
    },
    xmlContent,
    returnTotals: null,
  };
}
