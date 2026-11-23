import { pool } from '../db/pool.js';
import { classify } from './triage.service.js';
import { AppError } from '../utils/errors.js';
import { toTicket, toEvent } from '../utils/serializers.js';

export async function importTickets(items) {
  const result = { importedCount: 0, updatedCount: 0, skippedOverrideCount: 0, total: items.length };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of items) {
      const { category, priority } = classify(t.subject, t.body);

      // Atomic "insert if new": two concurrent imports can never create a duplicate
      const inserted = await client.query(
        `INSERT INTO tickets (external_id, subject, body, auto_category, category, priority)
         VALUES ($1, $2, $3, $4, $4, $5)
         ON CONFLICT (external_id) DO NOTHING
         RETURNING id`,
        [t.externalId, t.subject, t.body, category, priority]
      );
      if (inserted.rowCount === 1) { result.importedCount++; continue; }

      // Already exists: lock the row so a concurrent PATCH can't interleave
      const { rows } = await client.query(
        'SELECT * FROM tickets WHERE external_id = $1 FOR UPDATE', [t.externalId]);
      const existing = rows[0];
      const changed = existing.subject !== t.subject || existing.body !== t.body;

      if (existing.is_human_override) {
        result.skippedOverrideCount++;
        if (changed) {
          await client.query(
            'UPDATE tickets SET subject = $2, body = $3, updated_at = now() WHERE id = $1',
            [existing.id, t.subject, t.body]);
        }
      } else {
        result.updatedCount++;
        if (changed) {
          await client.query(
            `UPDATE tickets
             SET subject = $2, body = $3, auto_category = $4, category = $4,
                 priority = $5, updated_at = now()
             WHERE id = $1`,
            [existing.id, t.subject, t.body, category, priority]);
        }
      }
    }
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function ticketExists(id) {
  const { rowCount } = await pool.query('SELECT 1 FROM tickets WHERE id = $1', [id]);
  if (!rowCount) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
}

async function loadEvents(db, ticketId) {
  const { rows } = await db.query(
    'SELECT * FROM ticket_events WHERE ticket_id = $1 ORDER BY created_at DESC, id DESC', [ticketId]);
  return rows.map(toEvent);
}

export async function getTicket(id) {
  const { rows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  return { ticket: toTicket(rows[0]), events: await loadEvents(pool, id) };
}

export async function listTickets({ status, category, priority, q, page, limit }) {
  const where = [];
  const vals = [];
  const add = (sql, value) => { vals.push(value); where.push(sql.replace('?', `$${vals.length}`)); };

  if (status) add('status = ?', status);
  if (category) add('category = ?', category);
  if (priority) add('priority = ?', priority);
  if (q) {
    // Escape LIKE wildcards so "%" and "_" are searched literally
    const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    vals.push(pattern);
    where.push(`(subject ILIKE $${vals.length} OR body ILIKE $${vals.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [count, rows] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM tickets ${whereSql}`, vals),
    pool.query(
      `SELECT * FROM tickets ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, limit, offset]),
  ]);

  const total = count.rows[0].n;
  return { data: rows.rows.map(toTicket), page, pageSize: limit, total, totalPages: Math.ceil(total / limit) };
}