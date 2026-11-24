import { pool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';
import { toBooking } from '../utils/serializers.js';
import { validateBookingWindow } from '../utils/bookingRules.js';

const PAGE_SIZE = 10;
const MAX_FUTURE_BOOKINGS = 3;
const USER_LOCK_NAMESPACE = 1;   // first key of the advisory lock, so it cannot clash with other locks

const SELECT = `SELECT b.*, r.name AS resource_name
                FROM bookings b JOIN resources r ON r.id = b.resource_id`;

async function findById(db, id, lock = false) {
  const { rows } = await db.query(`${SELECT} WHERE b.id = $1${lock ? ' FOR UPDATE OF b' : ''}`, [id]);
  return rows[0];
}

const isFuture = (row) => new Date(row.start_time) > new Date();

// ---------- Create (B1-B9) ----------

export async function createBooking(userId, input) {
  // 400: grid, duration, future, 30 days (pure checks, no database needed)
  const { start, end } = validateBookingWindow(input.startTime, input.endTime);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 404: referenced ids
    const resource = await client.query('SELECT is_active FROM resources WHERE id = $1', [input.resourceId]);
    if (!resource.rowCount) throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    if (input.ticketId) {
      const ticket = await client.query('SELECT 1 FROM tickets WHERE id = $1', [input.ticketId]);
      if (!ticket.rowCount) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
    }

    // 409: B7 inactive resource
    if (!resource.rows[0].is_active) throw new AppError(409, 'CONFLICT', 'Resource is not active');

    // 409: B8 limit. Count-then-insert is a race, so serialise this user's bookings first.
    // The lock is released automatically at COMMIT or ROLLBACK.
    await client.query('SELECT pg_advisory_xact_lock($1::int, $2::int)', [USER_LOCK_NAMESPACE, userId]);
    const { rows: [{ n }] } = await client.query(
      `SELECT count(*)::int AS n FROM bookings
       WHERE user_id = $1 AND status IN ('PENDING', 'APPROVED') AND start_time > now()`,
      [userId]);
    if (n >= MAX_FUTURE_BOOKINGS) {
      throw new AppError(409, 'CONFLICT', `You already have ${MAX_FUTURE_BOOKINGS} upcoming bookings`);
    }

    // 409: B5/B6 overlap. The database enforces it atomically (exclusion constraint bookings_no_overlap).
    const inserted = await client.query(
      `INSERT INTO bookings (resource_id, user_id, ticket_id, start_time, end_time, purpose)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.resourceId, userId, input.ticketId ?? null, start.toISOString(), end.toISOString(), input.purpose]);

    const row = await findById(client, inserted.rows[0].id);
    await client.query('COMMIT');
    return toBooking(row);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23P01') throw new AppError(409, 'CONFLICT', 'That time slot is already booked');
    throw e;
  } finally {
    client.release();
  }
}

// ---------- Reads ----------

async function paginate(where, vals, page) {
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * PAGE_SIZE;
  const [count, rows] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM bookings b ${whereSql}`, vals),
    pool.query(
      `${SELECT} ${whereSql}
       ORDER BY b.start_time DESC, b.id DESC
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, PAGE_SIZE, offset]),
  ]);
  const total = count.rows[0].n;
  return { data: rows.rows.map(toBooking), page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

export function listMine(userId, { status, page }) {
  const where = ['b.user_id = $1'];
  const vals = [userId];
  if (status) { vals.push(status); where.push(`b.status = $${vals.length}`); }
  return paginate(where, vals, page);
}

export function listAll({ status, resourceId, from, to, page }) {
  const where = [];
  const vals = [];
  const add = (sql, value) => { vals.push(value); where.push(sql.replace('?', `$${vals.length}`)); };
  if (status) add('b.status = ?', status);
  if (resourceId) add('b.resource_id = ?', resourceId);
  // "overlapping from/to": the booking touches the window [from, to)
  if (to) add('b.start_time < ?', new Date(to).toISOString());
  if (from) add('b.end_time > ?', new Date(from).toISOString());
  return paginate(where, vals, page);
}

export async function bookingExists(id) {
  const { rowCount } = await pool.query('SELECT 1 FROM bookings WHERE id = $1', [id]);
  if (!rowCount) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
}

export async function getBooking(id, user) {
  const row = await findById(pool, id);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
  if (user.role !== 'ADMIN' && row.user_id !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'You can only view your own bookings');
  }
  return toBooking(row);
}

// ---------- Lifecycle (B10-B12) ----------

// Lock the booking row for the whole transition, so approve and cancel can never interleave
async function transition(id, apply) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await findById(client, id, true);
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Booking not found');
    await apply(client, row);
    const updated = await findById(client, id);
    await client.query('COMMIT');
    return toBooking(updated);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const cannotChange = () => new AppError(409, 'CONFLICT', 'This booking can no longer be changed');

export function cancelBooking(id, user) {
  return transition(id, async (client, row) => {
    if (row.user_id !== user.id) throw new AppError(403, 'FORBIDDEN', 'Only the owner can cancel a booking');
    if (!['PENDING', 'APPROVED'].includes(row.status) || !isFuture(row)) throw cannotChange();
    await client.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [id]);
  });
}

export function approveBooking(id) {
  return transition(id, async (client, row) => {
    if (row.status !== 'PENDING' || !isFuture(row)) throw cannotChange();
    await client.query("UPDATE bookings SET status = 'APPROVED' WHERE id = $1", [id]);
  });
}

export function rejectBooking(id, note) {
  return transition(id, async (client, row) => {
    if (row.status !== 'PENDING' || !isFuture(row)) throw cannotChange();
    await client.query("UPDATE bookings SET status = 'REJECTED', decision_note = $2 WHERE id = $1", [id, note]);
  });
}