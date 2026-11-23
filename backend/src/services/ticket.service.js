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