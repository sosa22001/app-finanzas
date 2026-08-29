import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, missingEnv } from './env';

/**
 * Un cliente por request, usando el JWT del usuario. Así RLS hace el trabajo
 * de aislamiento de datos y no necesitamos service_role en el backend.
 */
export const supabaseForToken = (accessToken: string): SupabaseClient => {
  if (missingEnv.length) {
    throw new Error(`Backend mal configurado: faltan ${missingEnv.join(', ')}`);
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
