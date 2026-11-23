import { pool } from '../db/pool.js';
import { CATEGORIES, PRIORITIES, STATUSES } from '../utils/constants.js';

const fill = (keys, rows) =>
  Object.fromEntries(keys.map((k) => [k, rows.find((r) => r.k === k)?.n ?? 0]));

export async function getTicketStats() {
  const group = (col) => pool.query(`SELECT ${col} AS k, count(*)::int AS n FROM tickets GROUP BY ${col}`);
  const [cat, pri, sta, rev] = await Promise.all([
    group('category'),
    group('priority'),
    group('status'),
    pool.query(`SELECT count(*)::int AS reviewed,
                       count(*) FILTER (WHERE category = auto_category)::int AS agreed
                FROM tickets WHERE is_reviewed`),
  ]);
  const { reviewed, agreed } = rev.rows[0];
  return {
    byCategory: fill(CATEGORIES, cat.rows),
    byPriority: fill(PRIORITIES, pri.rows),
    byStatus: fill(STATUSES, sta.rows),
    reviewedCount: reviewed,
    modelAgreementRate: reviewed ? Math.round((agreed / reviewed) * 1000) / 10 : 0,
  };
}