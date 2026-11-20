/**
 * Barrel / Fachada do Motor eSocial v. S-1.3 (cons. até NT 07/2026 rev. 20/10/2026)
 * Cada evento possui seu próprio arquivo isolado em ./events/ para governança e depuração.
 */

export {
  ESOCIAL_S13_NAMESPACE_VERSION,
  ESOCIAL_S13_VERSION_LABEL,
  type BuiltEsocialEventDraft,
  type EsocialCatalogEventMeta,
  type EsocialRubricaS1010,
  type EsocialS1200ItemRemun,
} from './types';

export {
  buildDefaultEsocialEmployerConfig,
  cleanDigits,
  deriveCbo,
  deriveMatricula,
  generateEsocialEventId,
  generateRetReceiptNumber,
  sanitizeText,
  validateEsocialEventId,
} from './helpers';

export {
  ESOCIAL_EVENT_CATALOG,
  ESOCIAL_STANDARD_RUBRICAS_S1010,
  ESOCIAL_TABELA_01_CATEGORIAS,
  ESOCIAL_TABELA_08_CLASS_TRIB,
  ESOCIAL_TABELA_18_MOTIVOS_AFAST,
  ESOCIAL_TABELA_19_MOTIVOS_DESLIG,
} from './catalogs';

export { buildEsocialS1000Event } from './events/s1000Empregador';
export { buildEsocialS1005Event } from './events/s1005Estabelecimentos';
export { buildEsocialS1010Event } from './events/s1010Rubricas';
export { buildEsocialS1020Event } from './events/s1020Lotacoes';
export { buildEsocialS2200Event } from './events/s2200Admissao';
export { buildEsocialS2206Event } from './events/s2206AltContratual';
export { buildEsocialS2230Event } from './events/s2230Afastamento';
export { buildEsocialS2299Event } from './events/s2299Desligamento';
export {
  buildEsocialS1200Event,
  decomposePayrollEntryToS1200Items,
} from './events/s1200Remuneracao';
export { buildEsocialS1210Event } from './events/s1210Pagamentos';
export { buildEsocialS1298Event } from './events/s1298Reabertura';
export { buildEsocialS1299Event } from './events/s1299Fechamento';
export { buildEsocialS3000Event } from './events/s3000Exclusao';
