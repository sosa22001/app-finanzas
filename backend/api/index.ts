/**
 * Punto de entrada para Vercel (Serverless Function).
 * Vercel enruta todo el tráfico aquí mediante los rewrites de vercel.json
 * y Express se encarga del resto, igual que en local.
 */
import { app } from '../src/app';

export default app;
