import type {
  ReinfEventCode,
  ReinfEventSeries,
  ReinfReturnTotals,
} from '../../types/database';

export const REINF_VERSION_LABEL = 'v2.1.2b (MOR v2.1.2.1 · Dev v2.8)';
export const REINF_SCHEMA_VERSION = 'v2_01_02';
export const REINF_SCHEMA_BASE = 'http://www.reinf.esocial.gov.br/schemas';

export interface ReinfCatalogEventMeta {
  code: ReinfEventCode;
  name: string;
  series: ReinfEventSeries;
  xmlEventTag: string;
  schemaSlug: string;
  legalDeadline: string;
  description: string;
}

export interface ReinfNatRendMeta {
  code: string;
  group: string;
  description: string;
  beneficiaryType: 'PF' | 'PJ' | 'PF/PJ';
  tributosPermitidos: string;
  crMensalPadrao: string;
  aceita13?: boolean;
  aceitaDeducao?: boolean;
}

export interface ReinfServCpMeta {
  code: string;
  description: string;
}

export interface BuiltReinfEventDraft {
  eventCode: ReinfEventCode;
  eventName: string;
  eventSeries: ReinfEventSeries;
  eventUid: string;
  competence: string | null;
  employeeId: string | null;
  payrollEntryId: string | null;
  beneficiaryDoc: string | null;
  beneficiaryName: string | null;
  natRend: string | null;
  indRetif: 1 | 2;
  tpAmb: 1 | 2;
  validationErrors: string[];
  validationWarnings: string[];
  payloadSummary: Record<string, string | number | boolean | null>;
  xmlContent: string;
  returnTotals: ReinfReturnTotals | null;
}
