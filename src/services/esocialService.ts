import { supabase } from '../lib/supabase';
import type {
  EsocialEmployerConfig,
  EsocialEventRecord,
  EsocialEventStatus,
} from '../types/database';
import {
  buildDefaultEsocialEmployerConfig,
  generateRetReceiptNumber,
  type BuiltEsocialEventDraft,
} from '../utils/esocial/esocialS13Engine';

export async function fetchEsocialEmployerConfig(tenantId: string): Promise<EsocialEmployerConfig> {
  if (!tenantId) return buildDefaultEsocialEmployerConfig('default');
  const { data, error } = await supabase
    .from('esocial_employer_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) {
    return buildDefaultEsocialEmployerConfig(tenantId);
  }

  return {
    ...(data as EsocialEmployerConfig),
    aliq_rat: Number(data.aliq_rat ?? 2),
    fap: Number(data.fap ?? 1),
  };
}

export async function upsertEsocialEmployerConfig(
  tenantId: string,
  patch: Partial<Omit<EsocialEmployerConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<EsocialEmployerConfig> {
  const defaults = buildDefaultEsocialEmployerConfig(tenantId);
  const payload = {
    tenant_id: tenantId,
    layout_version: patch.layout_version ?? defaults.layout_version,
    tp_amb: patch.tp_amb ?? defaults.tp_amb,
    proc_emi: patch.proc_emi ?? defaults.proc_emi,
    ver_proc: patch.ver_proc ?? defaults.ver_proc,
    class_trib: patch.class_trib ?? defaults.class_trib,
    ind_coop: patch.ind_coop ?? defaults.ind_coop,
    ind_constr: patch.ind_constr ?? defaults.ind_constr,
    ind_des_folha: patch.ind_des_folha ?? defaults.ind_des_folha,
    ind_opt_reg_eletron: patch.ind_opt_reg_eletron ?? defaults.ind_opt_reg_eletron,
    fpas: patch.fpas ?? defaults.fpas,
    cod_tercs: patch.cod_tercs ?? defaults.cod_tercs,
    aliq_rat: patch.aliq_rat ?? defaults.aliq_rat,
    fap: patch.fap ?? defaults.fap,
    cod_lotacao: patch.cod_lotacao ?? defaults.cod_lotacao,
    tp_lotacao: patch.tp_lotacao ?? defaults.tp_lotacao,
    ide_tab_rubr: patch.ide_tab_rubr ?? defaults.ide_tab_rubr,
    cnae_prep: patch.cnae_prep ?? defaults.cnae_prep,
    cnpj_sind_default: patch.cnpj_sind_default ?? defaults.cnpj_sind_default,
    trans_dctfweb: patch.trans_dctfweb ?? defaults.trans_dctfweb,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('esocial_employer_configs')
    .upsert(payload, { onConflict: 'tenant_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Erro ao salvar configuração S-1000/S-1005/S-1020 do eSocial.');
  }

  return data as EsocialEmployerConfig;
}

export async function fetchEsocialEvents(tenantId: string): Promise<EsocialEventRecord[]> {
  if (!tenantId) return [];
  const { data, error } = await supabase
    .from('esocial_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as EsocialEventRecord[]).map((row) => ({
    ...row,
    validation_errors: Array.isArray(row.validation_errors) ? row.validation_errors : [],
    validation_warnings: Array.isArray(row.validation_warnings) ? row.validation_warnings : [],
    payload_summary: row.payload_summary || {},
  }));
}

export async function createEsocialEventsBatch(
  tenantId: string,
  drafts: BuiltEsocialEventDraft[]
): Promise<EsocialEventRecord[]> {
  if (drafts.length === 0) return [];

  const rows = drafts.map((d) => ({
    tenant_id: tenantId,
    event_code: d.eventCode,
    event_name: d.eventName,
    event_category: d.eventCategory,
    event_uid: d.eventUid,
    competence: d.competence,
    employee_id: d.employeeId,
    payroll_entry_id: d.payrollEntryId,
    vacation_id: d.vacationId,
    ind_retif: d.indRetif,
    tp_amb: d.tpAmb,
    status: (d.validationErrors.length > 0 ? 'rejected' : 'validated') as EsocialEventStatus,
    validation_errors: d.validationErrors,
    validation_warnings: d.validationWarnings,
    payload_summary: d.payloadSummary,
    xml_content: d.xmlContent,
    return_totals: d.returnTotals,
  }));

  const { data, error } = await supabase.from('esocial_events').insert(rows).select('*');
  if (error) {
    throw new Error(error.message);
  }
  return (data || []) as EsocialEventRecord[];
}

export async function transmitEsocialEventsBatch(
  tenantId: string,
  eventIds: string[],
  existingEvents: EsocialEventRecord[]
): Promise<{ accepted: number; rejected: number }> {
  let accepted = 0;
  let rejected = 0;
  const nowIso = new Date().toISOString();

  for (let idx = 0; idx < eventIds.length; idx += 1) {
    const id = eventIds[idx];
    const evt = existingEvents.find((e) => e.id === id);
    if (!evt) continue;

    const hasErrors = (evt.validation_errors || []).length > 0;
    const nextStatus: EsocialEventStatus = hasErrors ? 'rejected' : 'accepted';
    const receipt = hasErrors ? null : generateRetReceiptNumber(Date.now() % 1000000 + idx + 1);
    const protocol = `RET-S13-${nowIso.slice(0, 10).replace(/-/g, '')}-${String(idx + 1).padStart(4, '0')}`;

    const { error } = await supabase
      .from('esocial_events')
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

  return { accepted, rejected };
}

export async function markEsocialEventExcluded(
  tenantId: string,
  originalEventId: string,
  s3000Draft: BuiltEsocialEventDraft
): Promise<void> {
  const nowIso = new Date().toISOString();
  await createEsocialEventsBatch(tenantId, [s3000Draft]);
  const { error } = await supabase
    .from('esocial_events')
    .update({
      status: 'excluded',
      updated_at: nowIso,
    })
    .eq('id', originalEventId)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);
}

export async function deleteEsocialEvent(tenantId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('esocial_events')
    .delete()
    .eq('id', eventId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
}
