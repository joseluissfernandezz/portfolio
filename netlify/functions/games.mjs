import { randomUUID } from 'node:crypto';
import { json, error, timed, ipHash, readJson } from '../lib/http.mjs';
import { store, readGames, top10, prune } from '../lib/store.mjs';

/**
 * API REST del ranking del juego de memoria
 *   GET   /api/games  → top 10
 *   POST  /api/games  → registra una partida terminada { moves, seconds } → { id, token, rank }
 *   PATCH /api/games  → pone nombre a tu partida      { id, token, name }
 */
const PAIRS = 8;
const NAME_RE = /^[\p{L}\p{N} ._-]{2,16}$/u;
const MAX_GAMES_PER_10_MIN = 10;

export default async (req, context) => {
  try {
    const s = store();

    if (req.method === 'GET') {
      const [ranking, dbMs] = await timed(async () => top10(await readGames(s)));
      return json({ ranking }, { dbMs });
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const moves = Number(body?.moves), seconds = Number(body?.seconds);
      // Validación en servidor: no se puede resolver con menos movimientos que parejas
      if (!Number.isInteger(moves) || moves < PAIRS || moves > 300) return error(400, 'Invalid moves');
      if (!Number.isInteger(seconds) || seconds < 4 || seconds > 3600) return error(400, 'Invalid time');

      const ip = ipHash(context);
      const [result, dbMs] = await timed(async () => {
        const db = await readGames(s);
        const now = Date.now();
        const recent = db.games.filter(g => g.ip === ip && now - g.at < 10 * 60e3).length;
        if (recent >= MAX_GAMES_PER_10_MIN) return null;

        const game = { id: ++db.seq, name: null, moves, seconds, token: randomUUID(), ip, at: now };
        db.games.push(game);
        db.total++;
        await s.setJSON('games', prune(db));

        const rank = db.games.filter(g => g.name && (g.moves < moves || (g.moves === moves && g.seconds < seconds))).length + 1;
        return { id: game.id, token: game.token, rank };
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
        const db = await readGames(s);
        const game = db.games.find(g => g.id === id && g.token === token && !g.name && Date.now() - g.at < 30 * 60e3);
        if (!game) return null;
        game.name = name;
        await s.setJSON('games', prune(db));
        return { ranking: top10(db) };
      });

      if (!result) return error(404, 'Game not found or already signed');
      return json(result, { dbMs });
    }

    return error(405, 'Method not allowed');
  } catch (e) {
    console.error(e);
    return error(500, 'Storage error');
  }
};

export const config = { path: '/api/games' };
