/**
 * Barrel do Motor EFD-Reinf v2.1.2b (Manual do Desenvolvedor v2.8)
 * Governança modular: cada evento possui seu próprio arquivo isolado em ./events/.
 */

export {
  REINF_SCHEMA_BASE,
  REINF_SCHEMA_VERSION,
  REINF_VERSION_LABEL,
  type BuiltReinfEventDraft,
  type ReinfCatalogEventMeta,
  type ReinfNatRendMeta,
  type ReinfServCpMeta,
} from './types';

export {
  buildDefaultReinfContributorConfig,
  cleanDigits,
  generateReinfEventId,
  generateReinfProtocolNumber,
  generateReinfReceiptNumber,
  round2,
  sanitizeReinfText,
  splitPjRetentionBreakdown,
  validateReinfEventId,
} from './helpers';

export {
  REINF_EVENT_CATALOG,
  REINF_TABELA_01_NAT_REND,
  REINF_TABELA_06_SERVICOS,
  REINF_TABELA_08_CLASS_TRIB,
} from './catalogs';

export { buildReinfR1000Event } from './events/r1000Contribuinte';
export { buildReinfR1070Event } from './events/r1070Processos';
export { buildReinfR2010Event, type ReinfR2010Input } from './events/r2010ServTomados';
export { buildReinfR2020Event, type ReinfR2020Input } from './events/r2020ServPrestados';
export { buildReinfR2060Event, type ReinfR2060Input } from './events/r2060Cprb';
export { buildReinfR2098Event } from './events/r2098Reabertura';
export { buildReinfR2099Event } from './events/r2099Fechamento';
export { buildReinfR4010Event, type ReinfR4010Input } from './events/r4010PagamentosPF';
export {
  buildReinfR4020FromPjPayrollEntry,
  buildReinfR4020ManualEvent,
  type ReinfR4020ManualInput,
} from './events/r4020PagamentosPJ';
export { buildReinfR4040Event, type ReinfR4040Input } from './events/r4040BenefNaoIdentificado';
export { buildReinfR4080Event, type ReinfR4080Input } from './events/r4080RetencaoRecebimento';
export { buildReinfR4099Event } from './events/r4099Fechamento';
export { buildReinfR9000Event } from './events/r9000Exclusao';
