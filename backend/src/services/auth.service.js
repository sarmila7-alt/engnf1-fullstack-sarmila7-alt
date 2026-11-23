import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';
import { toUser } from '../utils/serializers.js';

export async function register({ name, email, password }) {
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'USER') RETURNING *`,
      [name, email, hash]
    );
    return toUser(rows[0]);
  } catch (e) {
    if (e.code === '23505') throw new AppError(409, 'CONFLICT', 'Email already registered');
    throw e;
  }
}

export async function login({ email, password }) {
  const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new AppError(401, 'UNAUTHENTICATED', 'Invalid email or password');

  const token = jwt.sign(
    { sub: String(user.id), role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: '12h' }
  );
  return { token, user: toUser(user) };
}

export async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? toUser(rows[0]) : null;
}