import { getDatabase } from '@netlify/database';
import { json, error, timed } from '../lib/http.mjs';

/**
 * GET  /api/stats  → estadísticas públicas del portfolio
 * POST /api/stats  → registra una visita (agregada por día) y devuelve las estadísticas
 */
export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return error(405, 'Method not allowed');
  const { sql } = getDatabase();

  try {
    const [data, dbMs] = await timed(async () => {
      if (req.method === 'POST') {
        await sql`
          INSERT INTO visits (day, count) VALUES (CURRENT_DATE, 1)
          ON CONFLICT (day) DO UPDATE SET count = visits.count + 1`;
      }

      const [totals] = await sql`
        SELECT
          (SELECT COALESCE(SUM(count), 0)::int FROM visits)                          AS visits_total,
          (SELECT COALESCE(MAX(count), 0)::int FROM visits WHERE day = CURRENT_DATE) AS visits_today,
          (SELECT COUNT(*)::int FROM games)                                          AS games_total`;

      // Serie de los últimos 14 días, incluidos los días sin visitas
      const series = await sql`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(v.count, 0)::int AS count
        FROM generate_series((CURRENT_DATE - 13)::timestamp, CURRENT_DATE::timestamp, interval '1 day') AS d(day)
        LEFT JOIN visits v ON v.day = d.day::date
        ORDER BY d.day`;

      return { ...totals, series };
    });

    return json(data, { dbMs });
  } catch (e) {
    console.error(e);
    return error(500, 'Database error');
  }
};

export const config = { path: '/api/stats' };
