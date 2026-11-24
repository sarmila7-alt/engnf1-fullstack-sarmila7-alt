import { pool } from '../db/pool.js';
import { AppError } from '../utils/errors.js';
import { toResource } from '../utils/serializers.js';

const PAGE_SIZE = 10;
const COLUMNS = { name: 'name', type: 'type', capacity: 'capacity', description: 'description', isActive: 'is_active' };

// Escape LIKE wildcards so "%" and "_" are searched literally
const likePattern = (s) => `%${s.replace(/[\\%_]/g, '\\$&')}%`;

export async function listResources({ search, type, minCapacity, page }, role) {
  const where = [];
  const vals = [];
  const add = (sql, value) => { vals.push(value); where.push(sql.replace('?', `$${vals.length}`)); };

  if (role !== 'ADMIN') where.push('is_active = true');
  if (type) add('type = ?', type);
  if (minCapacity) add('capacity >= ?', minCapacity);
  if (search) {
    vals.push(likePattern(search));
    where.push(`(name ILIKE $${vals.length} OR description ILIKE $${vals.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * PAGE_SIZE;
  const [count, rows] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM resources ${whereSql}`, vals),
    pool.query(
      `SELECT * FROM resources ${whereSql}
       ORDER BY lower(name) ASC, id ASC
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
      [...vals, PAGE_SIZE, offset]),
  ]);
  const total = count.rows[0].n;
  return { data: rows.rows.map(toResource), page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}

// A USER must not learn that an inactive resource exists, so it is a 404 for them
export async function getResource(id, role) {
  const { rows } = await pool.query('SELECT * FROM resources WHERE id = $1', [id]);
  const row = rows[0];
  if (!row || (!row.is_active && role !== 'ADMIN')) throw new AppError(404, 'NOT_FOUND', 'Resource not found');
  return toResource(row);
}

export async function resourceExists(id) {
  const { rowCount } = await pool.query('SELECT 1 FROM resources WHERE id = $1', [id]);
  if (!rowCount) throw new AppError(404, 'NOT_FOUND', 'Resource not found');
}

const duplicateName = () => new AppError(409, 'CONFLICT', 'A resource with this name already exists');

export async function createResource({ name, type, capacity, description }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO resources (name, type, capacity, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, type, capacity, description || null]);
    return toResource(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw duplicateName();   // unique index on lower(name)
    throw e;
  }
}

export async function updateResource(id, changes) {
  const sets = [];
  const vals = [id];
  for (const [field, column] of Object.entries(COLUMNS)) {
    if (!(field in changes)) continue;
    vals.push(field === 'description' ? changes.description || null : changes[field]);
    sets.push(`${column} = $${vals.length}`);
  }
  try {
    const { rows } = await pool.query(
      `UPDATE resources SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals);
    if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Resource not found');
    return toResource(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw duplicateName();
    throw e;
  }
}

// Only startTime, endTime and status leave the server (B15): no userId, purpose or ticketId
export async function getAvailability(id, from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const { rows } = await pool.query(
    `SELECT start_time, end_time, status FROM bookings
     WHERE resource_id = $1 AND status IN ('PENDING', 'APPROVED')
       AND start_time < $3 AND end_time > $2
     ORDER BY start_time`,
    [id, start.toISOString(), end.toISOString()]);
  return {
    resourceId: id,
    from: start.toISOString(),
    to: end.toISOString(),
    bookings: rows.map((r) => ({ startTime: r.start_time, endTime: r.end_time, status: r.status })),
  };
}