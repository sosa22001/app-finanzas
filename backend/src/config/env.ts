import dotenv from 'dotenv';
import path from 'path';

// En local lee backend/.env; en Vercel las variables vienen del dashboard.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const;

/** Variables obligatorias que no están definidas. Vacío = todo bien. */
export const missingEnv = REQUIRED.filter((key) => !process.env[key]);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  isServerless: Boolean(process.env.VERCEL),
};

/**
 * Nunca lanzamos al importar el módulo: en serverless eso produce un
 * FUNCTION_INVOCATION_FAILED sin mensaje. Preferimos arrancar y responder
 * con un error claro en /api/health.
 */
if (missingEnv.length) {
  console.error(
    `[config] Faltan variables de entorno: ${missingEnv.join(', ')}. ` +
      'En local: copia backend/.env.example a backend/.env. ' +
      'En Vercel: Settings → Environment Variables (y vuelve a desplegar).',
  );
}
