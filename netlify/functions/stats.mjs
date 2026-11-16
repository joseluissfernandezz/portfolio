import { json, error, timed } from '../lib/http.mjs';
import { store, today, readVisits, readGames } from '../lib/store.mjs';

/**
 * GET  /api/stats  → estadísticas públicas del portfolio
 * POST /api/stats  → registra una visita (agregada por día) y devuelve las estadísticas
 */
export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return error(405, 'Method not allowed');

  try {
    const [data, dbMs] = await timed(async () => {
      const s = store();
      const visits = await readVisits(s);

      if (req.method === 'POST') {
        visits[today()] = (visits[today()] || 0) + 1;
        // Conserva ~13 meses de histórico
        const cutoff = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
        for (const day of Object.keys(visits)) if (day < cutoff) delete visits[day];
        await s.setJSON('visits', visits);
      }

      const games = await readGames(s);
      const series = [];
      for (let i = 13; i >= 0; i--) {
        const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        series.push({ day, count: visits[day] || 0 });
      }
      return {
        visits_total: Object.values(visits).reduce((a, b) => a + b, 0),
        visits_today: visits[today()] || 0,
        games_total: games.total,
        series
      };
    });

    return json(data, { dbMs });
  } catch (e) {
    console.error(e);
    return error(500, 'Storage error');
  }
};

export const config = { path: '/api/stats' };
