import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { json, error, ipHash, readJson } from '../lib/http.mjs';

/**
 * POST /api/contact  { name, email, message, website }
 *  1. Valida y aplica antispam (campo trampa "website" + límite por IP).
 *  2. Guarda SIEMPRE el mensaje en Netlify Blobs (store "contact"): nunca se pierde.
 *  3. Si hay RESEND_API_KEY, lo reenvía por email (Resend). Si el email falla,
 *     el mensaje sigue guardado y el visitante recibe OK igualmente.
 *
 * Variables de entorno:
 *  RESEND_API_KEY  (secreta) clave de https://resend.com
 *  CONTACT_TO      destino del aviso (por defecto el correo público del portfolio)
 *  CONTACT_FROM    remitente (por defecto el de pruebas de Resend)
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_10_MIN = 3;

export default async (req, context) => {
  if (req.method !== 'POST') return error(405, 'Method not allowed');

  const body = await readJson(req);
  if (!body) return error(400, 'Invalid body');

  // Trampa para bots: un humano nunca rellena este campo oculto
  if (body.website) return json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 80);
  const email = String(body.email || '').trim().slice(0, 120);
  const message = String(body.message || '').trim().slice(0, 4000);
  if (name.length < 2) return error(400, 'name');
  if (!EMAIL_RE.test(email)) return error(400, 'email');
  if (message.length < 10) return error(400, 'message');

  const store = getStore({ name: 'contact', consistency: 'strong' });
  const ip = ipHash(context);

  try {
    // Límite: 3 mensajes cada 10 minutos por IP (hash, sin guardar la IP)
    const rlKey = `ratelimit/${ip}`;
    const now = Date.now();
    const hits = ((await store.get(rlKey, { type: 'json' })) || []).filter(t => now - t < 10 * 60e3);
    if (hits.length >= MAX_PER_10_MIN) return error(429, 'rate');
    await store.setJSON(rlKey, [...hits, now]);

    // Guardar el mensaje (una clave por mensaje, ordenable por fecha)
    const at = new Date(now).toISOString();
    const id = `${at.replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}`;
    await store.setJSON(`messages/${id}`, { name, email, message, at, ip });

    const emailed = await sendEmail({ name, email, message, at });
    return json({ ok: true, emailed }, { status: 201 });
  } catch (e) {
    console.error(e);
    return error(500, 'server');
  }
};

async function sendEmail({ name, email, message, at }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || 'Portfolio <onboarding@resend.dev>',
        to: process.env.CONTACT_TO || 'joseluiscanrull@gmail.com',
        reply_to: email,
        subject: `Portfolio · Mensaje de ${name}`,
        text: `${message}\n\n—\n${name} <${email}>\n${at}\nResponder a este correo contesta directamente a ${email}.`
      })
    });
    if (!res.ok) console.error('Resend', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('Resend', e);
    return false;
  }
}

export const config = { path: '/api/contact' };
