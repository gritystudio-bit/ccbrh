import { supabase } from '../lib/supabase';
import type {
  SupportTechnicalContext,
  SupportTicket,
  SupportTicketType,
} from '../admin/types';

export const SUPPORT_TITLE_MIN = 3;
export const SUPPORT_TITLE_MAX = 120;
export const SUPPORT_DESC_MIN = 10;
export const SUPPORT_DESC_MAX = 4000;

export interface CreateSupportTicketInput {
  userId: string;
  tipo: SupportTicketType;
  titulo: string;
  descricao: string;
  planTier?: string | null;
  contexto: SupportTechnicalContext;
}

export interface SupportValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSupportTicketInput(titulo: string, descricao: string): SupportValidationResult {
  const cleanTitle = titulo.trim();
  const cleanDesc = descricao.trim();

  if (cleanTitle.length < SUPPORT_TITLE_MIN || cleanTitle.length > SUPPORT_TITLE_MAX) {
    return {
      valid: false,
      error: `O título deve ter entre ${SUPPORT_TITLE_MIN} e ${SUPPORT_TITLE_MAX} caracteres.`,
    };
  }

  if (cleanDesc.length < SUPPORT_DESC_MIN || cleanDesc.length > SUPPORT_DESC_MAX) {
    return {
      valid: false,
      error: `A descrição deve ter entre ${SUPPORT_DESC_MIN} e ${SUPPORT_DESC_MAX} caracteres.`,
    };
  }

  return { valid: true };
}

export function buildSupportTechnicalContext(options?: {
  activeTab?: string;
  companyName?: string | null;
}): SupportTechnicalContext {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';

  return {
    route: hasWindow ? `${window.location.pathname}${window.location.hash}` : '/',
    environment: import.meta.env.MODE || 'production',
    activeTab: options?.activeTab,
    companyName: options?.companyName ?? null,
    userAgent: hasNavigator ? navigator.userAgent : 'unknown',
    viewport: hasWindow ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
    language: hasNavigator ? navigator.language : 'pt-BR',
    timestamp: new Date().toISOString(),
  };
}

export function isMissingSupportTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('suporte_solicitacoes') && (msg.includes('does not exist') || msg.includes('schema cache'))
  );
}

export async function listMySupportTickets(userId: string): Promise<{
  tickets: SupportTicket[];
  moduleUnavailable: boolean;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('suporte_solicitacoes')
    .select(
      'id, user_id, tipo, titulo, descricao, status, resposta_equipe, plan_tier, contexto, created_at, updated_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingSupportTableError(error)) {
      return { tickets: [], moduleUnavailable: true, error: null };
    }
    return { tickets: [], moduleUnavailable: false, error: error.message };
  }

  return {
    tickets: (data || []) as SupportTicket[],
    moduleUnavailable: false,
    error: null,
  };
}

export async function createSupportTicket(input: CreateSupportTicketInput): Promise<{
  ticket: SupportTicket | null;
  moduleUnavailable: boolean;
  error: string | null;
}> {
  const validation = validateSupportTicketInput(input.titulo, input.descricao);
  if (!validation.valid) {
    return { ticket: null, moduleUnavailable: false, error: validation.error || 'Dados inválidos.' };
  }

  const { data, error } = await supabase
    .from('suporte_solicitacoes')
    .insert({
      user_id: input.userId,
      tipo: input.tipo,
      titulo: input.titulo.trim(),
      descricao: input.descricao.trim(),
      status: 'aberto',
      resposta_equipe: null,
      plan_tier: input.planTier ?? null,
      contexto: input.contexto,
    })
    .select(
      'id, user_id, tipo, titulo, descricao, status, resposta_equipe, plan_tier, contexto, created_at, updated_at'
    )
    .single();

  if (error) {
    if (isMissingSupportTableError(error)) {
      return { ticket: null, moduleUnavailable: true, error: null };
    }
    return { ticket: null, moduleUnavailable: false, error: error.message };
  }

  return {
    ticket: data as SupportTicket,
    moduleUnavailable: false,
    error: null,
  };
}
