import type {
  EsocialEventCategory,
  EsocialEventCode,
  EsocialReturnTotals,
} from '../../types/database';

export const ESOCIAL_S13_VERSION_LABEL = 'v. S-1.3 (cons. até NT 07/2026 rev. 20/10/2026)';
export const ESOCIAL_S13_NAMESPACE_VERSION = 'v_S_01_03_00';

export interface EsocialCatalogEventMeta {
  code: EsocialEventCode;
  name: string;
  category: EsocialEventCategory;
  xmlRootTag: string;
  schemaSlug: string;
  legalDeadline: string;
  description: string;
}

export interface EsocialRubricaS1010 {
  codRubr: string;
  dscRubr: string;
  natRubr: string;
  natRubrDesc: string;
  tpRubr: 1 | 2 | 3 | 4;
  codIncCP: string;
  codIncIRRF: string;
  codIncFGTS: string;
}

export interface EsocialS1200ItemRemun {
  codRubr: string;
  ideTabRubr: string;
  dscRubr: string;
  natRubr: string;
  natRubrDesc: string;
  tpRubr: 1 | 2;
  codIncCP: string;
  codIncIRRF: string;
  codIncFGTS: string;
  refLabel: string;
  vrRubr: number;
  indApurIR: 0;
}

export interface BuiltEsocialEventDraft {
  eventCode: EsocialEventCode;
  eventName: string;
  eventCategory: EsocialEventCategory;
  eventUid: string;
  competence: string | null;
  employeeId: string | null;
  payrollEntryId: string | null;
  vacationId: string | null;
  indRetif: 1 | 2;
  tpAmb: 1 | 2;
  validationErrors: string[];
  validationWarnings: string[];
  payloadSummary: Record<string, string | number | boolean | null>;
  xmlContent: string;
  returnTotals: EsocialReturnTotals | null;
}
