import type { ReinfContributorConfig } from '../../types/database';

export function buildDefaultReinfContributorConfig(tenantId: string): ReinfContributorConfig {
  const now = new Date().toISOString();
  return {
    id: `reinf-cfg-${tenantId}`,
    tenant_id: tenantId,
    layout_version: 'v2.1.2b',
    tp_amb: 2,
    proc_emi: 1,
    ver_proc: 'CCBRH-REINF-2.1.2b',
    class_trib: '99',
    ind_escrituracao: 1,
    ind_desoneracao: 0,
    ind_acordo_isen_multa: 0,
    ind_sit_pj: 0,
    contato_nome: 'Responsável Fiscal CCBRH',
    contato_cpf: '00000000000',
    contato_fone: '1130000000',
    contato_email: 'fiscal@ccbrh.com.br',
    resp_nome: 'Contador Responsável CCBRH',
    resp_cpf: '00000000000',
    default_nat_rend_pj: '15014',
    default_tp_servico_cp: '100000028',
    trans_dctfweb: true,
    created_at: now,
    updated_at: now,
  };
}

/**
 * REGRA_VALIDA_ID_EVENTO (Anexo II EFD-Reinf v2.1.2b p. 4):
 * A identificação única do evento (Id) possui exatos 36 caracteres:
 * IDTNNNNNNNNNNNNNNAAAAMMDDHHMMSSQQQQQ
 */
export function generateReinfEventId(params: {
  tpInsc?: 1 | 2;
  nrInsc?: string | null;
  timestamp?: Date;
  sequence?: number;
}): string {
  const tpInsc = params.tpInsc ?? 1;
  const digits = (params.nrInsc || '').replace(/\D/g, '');
  const baseInsc =
    tpInsc === 1
      ? (digits.slice(0, 8) || '00000000').padEnd(14, '0')
      : (digits.slice(0, 11) || '00000000000').padEnd(14, '0');

  const dt = params.timestamp || new Date();
  const yyyy = String(dt.getFullYear()).padStart(4, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  const seq = String(Math.max(1, Math.min(99999, params.sequence ?? 1))).padStart(5, '0');

  return `ID${tpInsc}${baseInsc}${yyyy}${mm}${dd}${hh}${mi}${ss}${seq}`;
}

export function validateReinfEventId(eventId: string): boolean {
  return eventId.length === 36 && /^ID[12]\d{33}$/.test(eventId);
}

export function generateReinfReceiptNumber(sequence = 1): string {
  const seq = String(Math.max(1, sequence)).padStart(8, '0');
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `1.1.${ym}.0000000000-${seq}`;
}

export function generateReinfProtocolNumber(sequence = 1): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return `REINF-28-${stamp}-${String(sequence).padStart(6, '0')}`;
}

export const cleanDigits = (val?: string | null, fallback = ''): string =>
  (val || '').replace(/\D/g, '') || fallback;

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const sanitizeReinfText = (val?: string | null, maxLen = 70): string =>
  (val || '')
    .replace(/[<>&"|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);

/**
 * Decompõe a retenção total de PJ (IRRF 1,5% + PCC 4,65% quando aplicável)
 * nos campos específicos do evento R-4020 (vlrIR, vlrCSLL, vlrCofins, vlrPP).
 */
export function splitPjRetentionBreakdown(grossAmount: number, totalRetention: number): {
  vlrBaseIR: number;
  vlrIR: number;
  vlrBaseCSLL: number;
  vlrCSLL: number;
  vlrBaseCofins: number;
  vlrCofins: number;
  vlrBasePP: number;
  vlrPP: number;
} {
  const gross = round2(Math.max(0, grossAmount));
  const ret = round2(Math.max(0, totalRetention));
  if (gross <= 0 || ret <= 0) {
    return {
      vlrBaseIR: gross,
      vlrIR: 0,
      vlrBaseCSLL: 0,
      vlrCSLL: 0,
      vlrBaseCofins: 0,
      vlrCofins: 0,
      vlrBasePP: 0,
      vlrPP: 0,
    };
  }

  // Padrão serviços profissionais Lei 10.833/2003 (1,5% IRRF + 1% CSLL + 3% Cofins + 0,65% PIS = 6,15%)
  const ratio = ret / gross;
  if (ratio >= 0.055) {
    const vlrIR = round2(gross * 0.015);
    const vlrCSLL = round2(gross * 0.01);
    const vlrCofins = round2(gross * 0.03);
    const vlrPP = round2(Math.max(0, ret - vlrIR - vlrCSLL - vlrCofins));
    return {
      vlrBaseIR: gross,
      vlrIR,
      vlrBaseCSLL: gross,
      vlrCSLL,
      vlrBaseCofins: gross,
      vlrCofins,
      vlrBasePP: gross,
      vlrPP,
    };
  }

  // Somente IRRF retido na fonte (ex.: 1,5% ou 1,0%)
  return {
    vlrBaseIR: gross,
    vlrIR: ret,
    vlrBaseCSLL: 0,
    vlrCSLL: 0,
    vlrBaseCofins: 0,
    vlrCofins: 0,
    vlrBasePP: 0,
    vlrPP: 0,
  };
}
