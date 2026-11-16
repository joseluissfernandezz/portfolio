import { getStore } from '@netlify/blobs';

/** Almacén persistente de la API (Netlify Blobs, consistencia fuerte). */
export const store = () => getStore({ name: 'portfolio', consistency: 'strong' });

export const today = () => new Date().toISOString().slice(0, 10);

/** Visitas agregadas por día: { "YYYY-MM-DD": n }. Sin datos personales. */
export async function readVisits(s) {
  return (await s.get('visits', { type: 'json' })) || {};
}

/** Partidas: { seq, total, games: [{ id, name, moves, seconds, token, ip, at }] } */
export async function readGames(s) {
  return (await s.get('games', { type: 'json' })) || { seq: 0, total: 0, games: [] };
}

const byScore = (a, b) => a.moves - b.moves || a.seconds - b.seconds || a.at - b.at;

export function top10(db) {
  return db.games
    .filter(g => g.name)
    .sort(byScore)
    .slice(0, 10)
    .map(({ name, moves, seconds, at }) => ({ name, moves, seconds, day: new Date(at).toISOString().slice(0, 10) }));
}

/** Mantiene el documento pequeño: top 50 firmadas + partidas sin firmar de los últimos 30 min. */
export function prune(db) {
  const now = Date.now();
  const signed = db.games.filter(g => g.name).sort(byScore).slice(0, 50);
  const pending = db.games.filter(g => !g.name && now - g.at < 30 * 60e3);
  db.games = [...signed, ...pending];
  return db;
}
