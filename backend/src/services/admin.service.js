import { pool } from '../db/pool.js';
import { BOOKING_STATUSES } from '../utils/constants.js';
import { getTicketStats } from './stats.service.js';

export async function getAdminStats() {
  const [active, byStatus, top, ticketStats] = await Promise.all([
    pool.query('SELECT count(*)::int AS n FROM resources WHERE is_active'),
    pool.query('SELECT status AS k, count(*)::int AS n FROM bookings GROUP BY status'),
    // "top" = most bookings of any status; ties are broken by name so the result is stable
    pool.query(
      `SELECT r.id, r.name, count(b.id)::int AS n
       FROM resources r JOIN bookings b ON b.resource_id = r.id
       GROUP BY r.id, r.name
       ORDER BY n DESC, lower(r.name) ASC
       LIMIT 3`),
    getTicketStats(),
  ]);
  return {
    activeResources: active.rows[0].n,
    // all four keys are always present, even with a count of 0
    bookingsByStatus: Object.fromEntries(
      BOOKING_STATUSES.map((s) => [s, byStatus.rows.find((r) => r.k === s)?.n ?? 0])),
    topResources: top.rows.map((r) => ({ resourceId: r.id, name: r.name, bookingCount: r.n })),
    ticketStats,
  };
}