import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[ccbrh] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas no ambiente.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function createCandidatePortalClient(candidateToken: string): SupabaseClient {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          'x-candidate-token': candidateToken,
        },
      },
    }
  );
}
