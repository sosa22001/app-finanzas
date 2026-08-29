import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    const msg = `[config] Falta la variable ${key}. En local: copia backend/.env.example a backend/.env. En Vercel: agrégala en Settings → Environment Variables.`;
    console.error(msg);
    // En local queremos fallar rápido; en serverless lanzamos para ver el error en los logs.
    if (!process.env.VERCEL) process.exit(1);
    throw new Error(msg);
  }
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
