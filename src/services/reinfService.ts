import { supabase } from '../lib/supabase';
import type {
  ReinfContributorConfig,
  ReinfEventRecord,
  ReinfEventStatus,
} from '../types/database';
import {
  buildDefaultReinfContributorConfig,
  generateReinfProtocolNumber,
  generateReinfReceiptNumber,
  type BuiltReinfEventDraft,
} from '../utils/reinf/reinfEngine';

export async function fetchReinfContributorConfig(
  tenantId: string
): Promise<ReinfContributorConfig> {
  if (!tenantId) return buildDefaultReinfContributorConfig('default');
  const { data, error } = await supabase
    .from('reinf_contributor_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) {
    return buildDefaultReinfContributorConfig(tenantId);
  }
  return data as ReinfContributorConfig;
}

export async function upsertReinfContributorConfig(
  tenantId: string,
  patch: Partial<Omit<ReinfContributorConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<ReinfContributorConfig> {
  const defaults = buildDefaultReinfContributorConfig(tenantId);
  const payload = {
    tenant_id: tenantId,
    layout_version: patch.layout_version ?? defaults.layout_version,
    tp_amb: patch.tp_amb ?? defaults.tp_amb,
    proc_emi: patch.proc_emi ?? defaults.proc_emi,
    ver_proc: patch.ver_proc ?? defaults.ver_proc,
    class_trib: patch.class_trib ?? defaults.class_trib,
    ind_escrituracao: patch.ind_escrituracao ?? defaults.ind_escrituracao,
    ind_desoneracao: patch.ind_desoneracao ?? defaults.ind_desoneracao,
    ind_acordo_isen_multa: patch.ind_acordo_isen_multa ?? defaults.ind_acordo_isen_multa,
    ind_sit_pj: patch.ind_sit_pj ?? defaults.ind_sit_pj,
    contato_nome: patch.contato_nome ?? defaults.contato_nome,
    contato_cpf: patch.contato_cpf ?? defaults.contato_cpf,
    contato_fone: patch.contato_fone ?? defaults.contato_fone,
    contato_email: patch.contato_email ?? defaults.contato_email,
    resp_nome: patch.resp_nome ?? defaults.resp_nome,
    resp_cpf: patch.resp_cpf ?? defaults.resp_cpf,
    default_nat_rend_pj: patch.default_nat_rend_pj ?? defaults.default_nat_rend_pj,
    default_tp_servico_cp: patch.default_tp_servico_cp ?? defaults.default_tp_servico_cp,
    trans_dctfweb: patch.trans_dctfweb ?? defaults.trans_dctfweb,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('reinf_contributor_configs')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao salvar configuração R-1000 da EFD-Reinf.');
  }

  return data as ReinfContributorConfig;
}

export async function fetchReinfEvents(tenantId: string): Promise<ReinfEventRecord[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('reinf_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return (data as ReinfEventRecord[]).map((row) => ({
    ...row,
    validation_errors: Array.isArray(row.validation_errors) ? row.validation_errors : [],
    validation_warnings: Array.isArray(row.validation_warnings) ? row.validation_warnings : [],
    payload_summary: row.payload_summary || {},
  }));
}

export async function createReinfEventsBatch(
  tenantId: string,
  drafts: BuiltReinfEventDraft[]
): Promise<ReinfEventRecord[]> {
  if (drafts.length === 0) return [];

  const rows = drafts.map((d) => ({
    tenant_id: tenantId,
    event_code: d.eventCode,
    event_name: d.eventName,
    event_series: d.eventSeries,
    event_uid: d.eventUid,
    competence: d.competence,
    employee_id: d.employeeId,
    payroll_entry_id: d.payrollEntryId,
    beneficiary_doc: d.beneficiaryDoc,
    beneficiary_name: d.beneficiaryName,
    nat_rend: d.natRend,
    ind_retif: d.indRetif,
    tp_amb: d.tpAmb,
    status: (d.validationErrors.length > 0 ? 'rejected' : 'validated') as ReinfEventStatus,
    validation_errors: d.validationErrors,
    validation_warnings: d.validationWarnings,
    payload_summary: d.payloadSummary,
    xml_content: d.xmlContent,
    return_totals: d.returnTotals,
  }));

  const { data, error } = await supabase.from('reinf_events').insert(rows).select('*');
  if (error) throw new Error(error.message);
  return (data || []) as ReinfEventRecord[];
}

export async function transmitReinfEventsBatch(
  tenantId: string,
  eventIds: string[],
  existingEvents: ReinfEventRecord[]
): Promise<{ accepted: number; rejected: number; protocol: string }> {
  let accepted = 0;
  let rejected = 0;
  const nowIso = new Date().toISOString();
  const protocol = generateReinfProtocolNumber(Date.now() % 999999);

  for (let idx = 0; idx < eventIds.length; idx += 1) {
    const id = eventIds[idx];
    const evt = existingEvents.find((e) => e.id === id);
    if (!evt) continue;

    const hasErrors = (evt.validation_errors || []).length > 0;
    const nextStatus: ReinfEventStatus = hasErrors ? 'rejected' : 'accepted';
    const receipt = hasErrors ? null : generateReinfReceiptNumber(Date.now() % 100000 + idx + 1);

    const { error } = await supabase
      .from('reinf_events')
      .update({
        status: nextStatus,
        receipt_number: receipt,
        protocol_number: protocol,
        transmitted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(error.message);
    if (hasErrors) {
      rejected += 1;
    } else {
      accepted += 1;
    }
  }

  return { accepted, rejected, protocol };
}

export async function markReinfEventExcluded(
  tenantId: string,
  originalEventId: string,
  r9000Draft: BuiltReinfEventDraft
): Promise<void> {
  const nowIso = new Date().toISOString();
  await createReinfEventsBatch(tenantId, [r9000Draft]);
  const { error } = await supabase
    .from('reinf_events')
    .update({
      status: 'excluded',
      updated_at: nowIso,
    })
    .eq('id', originalEventId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
}

export async function deleteReinfEvent(tenantId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('reinf_events')
    .delete()
    .eq('id', eventId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
}
