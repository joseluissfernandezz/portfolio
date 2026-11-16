import { randomUUID } from 'node:crypto';
import { getDatabase } from '@netlify/database';
import { json, error, timed, ipHash, readJson } from '../lib/http.mjs';

/**
 * API REST del ranking del juego de memoria
 *   GET   /api/games  → top 10
 *   POST  /api/games  → registra una partida terminada { moves, seconds } → { id, token, rank }
 *   PATCH /api/games  → pone nombre a tu partida      { id, token, name }
 */
const PAIRS = 8;
const NAME_RE = /^[\p{L}\p{N} ._-]{2,16}$/u;
const MAX_GAMES_PER_10_MIN = 10;

const top10 = sql => sql`
  SELECT name, moves, seconds, to_char(created_at, 'YYYY-MM-DD') AS day
  FROM games
  WHERE name IS NOT NULL
  ORDER BY moves, seconds, created_at
  LIMIT 10`;

export default async (req, context) => {
  const { sql } = getDatabase();

  try {
    if (req.method === 'GET') {
      const [rows, dbMs] = await timed(() => top10(sql));
      return json({ ranking: rows }, { dbMs });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const moves = Number(body?.moves), seconds = Number(body?.seconds);
      // Validación en servidor: no se puede resolver con menos movimientos que parejas
      if (!Number.isInteger(moves) || moves < PAIRS || moves > 300) return error(400, 'Invalid moves');
      if (!Number.isInteger(seconds) || seconds < 4 || seconds > 3600) return error(400, 'Invalid time');

      const ip = ipHash(context);
      const [result, dbMs] = await timed(async () => {
        const [{ recent }] = await sql`
          SELECT COUNT(*)::int AS recent FROM games
          WHERE ip_hash = ${ip} AND created_at > now() - interval '10 minutes'`;
        if (recent >= MAX_GAMES_PER_10_MIN) return null;

        const token = randomUUID();
        const [row] = await sql`
          INSERT INTO games (moves, seconds, claim_token, ip_hash)
          VALUES (${moves}, ${seconds}, ${token}, ${ip})
          RETURNING id`;
        const [{ rank }] = await sql`
          SELECT COUNT(*)::int + 1 AS rank FROM games
          WHERE name IS NOT NULL AND (moves < ${moves} OR (moves = ${moves} AND seconds < ${seconds}))`;
        return { id: row.id, token, rank };
      });

      if (!result) return error(429, 'Too many games, try again later');
      return json(result, { status: 201, dbMs });
    }

    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const id = Number(body?.id);
      const token = String(body?.token || '');
      const name = String(body?.name || '').trim().replace(/\s+/g, ' ');
      if (!Number.isInteger(id) || !/^[0-9a-f-]{36}$/i.test(token)) return error(400, 'Invalid game');
      if (!NAME_RE.test(name)) return error(400, 'Invalid name');

      const [result, dbMs] = await timed(async () => {
        const updated = await sql`
          UPDATE games SET name = ${name}
          WHERE id = ${id} AND claim_token = ${token}::uuid AND name IS NULL
            AND created_at > now() - interval '30 minutes'
          RETURNING id`;
        if (!updated.length) return null;
        return { ranking: await top10(sql) };
      });

      if (!result) return error(404, 'Game not found or already signed');
      return json(result, { dbMs });
    }

    return error(405, 'Method not allowed');
  } catch (e) {
    console.error(e);
    return error(500, 'Database error');
  }
};

export const config = { path: '/api/games' };
