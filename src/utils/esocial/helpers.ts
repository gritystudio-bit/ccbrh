import type { Employee, EsocialEmployerConfig, Job } from '../../types/database';

export function buildDefaultEsocialEmployerConfig(tenantId: string): EsocialEmployerConfig {
  const now = new Date().toISOString();
  return {
    id: `esocial-cfg-${tenantId}`,
    tenant_id: tenantId,
    layout_version: 'S-1.3',
    tp_amb: 2,
    proc_emi: 1,
    ver_proc: 'CCBRH-2026.3',
    class_trib: '99',
    ind_coop: 0,
    ind_constr: 0,
    ind_des_folha: 0,
    ind_opt_reg_eletron: 1,
    fpas: '515',
    cod_tercs: '0079',
    aliq_rat: 2.0,
    fap: 1.0,
    cod_lotacao: 'LOT-001',
    tp_lotacao: '01',
    ide_tab_rubr: 'TABRUB01',
    cnae_prep: '6201501',
    cnpj_sind_default: '00000000000000',
    trans_dctfweb: true,
    created_at: now,
    updated_at: now,
  };
}

/**
 * REGRA_VALIDA_ID_EVENTO (Anexo II - p. 31):
 * A identificação única do evento (Id) é composta por exatos 36 caracteres:
 * IDTNNNNNNNNNNNNNNAAAAMMDDHHMMSSQQQQQ
 */
export function generateEsocialEventId(params: {
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

export function validateEsocialEventId(eventId: string): boolean {
  return eventId.length === 36 && /^ID[12]\d{33}$/.test(eventId);
}

export function generateRetReceiptNumber(sequence = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(12, '0');
  return `1.2.${year}${month}.${seq}`.slice(0, 23);
}

export const cleanDigits = (val?: string | null, fallback = ''): string =>
  (val || '').replace(/\D/g, '') || fallback;

export const sanitizeText = (val?: string | null, maxLen = 70): string =>
  (val || '')
    .replace(/[<>&"|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);

export const deriveMatricula = (emp: Employee): string => {
  const shortId = emp.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  return `MAT-${shortId}`;
};

export const deriveCbo = (job?: Job): string => {
  const title = (job?.title || '').toLowerCase();
  if (title.includes('gerente') || title.includes('diretor')) return '142105';
  if (title.includes('analista') || title.includes('rh')) return '252405';
  if (title.includes('vendedor') || title.includes('comercial')) return '521110';
  if (title.includes('caixa') || title.includes('atendente')) return '421125';
  return '411010';
};
