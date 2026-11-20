import type { AdminTabId } from './types';

export const ADMIN_BASE_PATH = '/admin';

export const VALID_ADMIN_TABS: readonly AdminTabId[] = [
  'dashboard',
  'tenants',
  'emails',
  'plans',
  'flags',
  'support',
] as const;

/**
 * Normaliza um pathname removendo barras duplicadas, query/hash e barra final.
 */
export function normalizePathname(rawPathname: string): string {
  const withoutHash = rawPathname.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  const collapsed = withoutQuery.replace(/\/{2,}/g, '/').trim();
  if (!collapsed || collapsed === '/') return '/';
  const withLeadingSlash = collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

/**
 * Verifica se o pathname pertence ao portal administrativo isolado (/admin ou /admin/*).
 * Evita falsos positivos como "/administracao" ou "/admin-panel".
 */
export function isAdminPathname(rawPathname: string): boolean {
  const normalized = normalizePathname(rawPathname).toLowerCase();
  return normalized === ADMIN_BASE_PATH || normalized.startsWith(`${ADMIN_BASE_PATH}/`);
}

/**
 * Extrai a aba administrativa correspondente a um pathname /admin/*.
 * Qualquer subrota desconhecida cai com segurança em "dashboard".
 */
export function resolveAdminTabFromPath(rawPathname: string): AdminTabId {
  const normalized = normalizePathname(rawPathname).toLowerCase();
  if (!isAdminPathname(normalized)) return 'dashboard';

  const rest = normalized.slice(ADMIN_BASE_PATH.length).replace(/^\/+/, '');
  const segment = rest.split('/')[0] ?? '';
  if ((VALID_ADMIN_TABS as readonly string[]).includes(segment)) {
    return segment as AdminTabId;
  }
  return 'dashboard';
}

/**
 * Constrói o pathname canônico para uma aba do portal administrativo.
 */
export function buildAdminTabPath(tab: AdminTabId): string {
  return tab === 'dashboard' ? ADMIN_BASE_PATH : `${ADMIN_BASE_PATH}/${tab}`;
}

/**
 * Formata bytes para leitura humana (B, KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

/**
 * Formata valores monetários em Real Brasileiro (BRL).
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}
