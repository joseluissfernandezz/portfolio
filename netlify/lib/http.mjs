import { createHash } from 'node:crypto';

/** Respuesta JSON con cabecera Server-Timing (el front muestra la latencia de la BD). */
export function json(body, { status = 200, dbMs } = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };
  if (dbMs != null) headers['Server-Timing'] = `db;desc="Netlify Blobs";dur=${dbMs.toFixed(1)}`;
  return new Response(JSON.stringify(body), { status, headers });
}

export const error = (status, message) => json({ error: message }, { status });

/** Hash corto y no reversible de la IP: sirve para limitar abusos sin guardar la IP. */
export function ipHash(context) {
  const salt = process.env.IP_SALT || 'portfolio-jl';
  return createHash('sha256').update(`${salt}:${context?.ip || 'unknown'}`).digest('hex').slice(0, 16);
}

/** Ejecuta fn midiendo cuánto tarda (ms). */
export async function timed(fn) {
  const t0 = performance.now();
  const result = await fn();
  return [result, performance.now() - t0];
}

export async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}
