import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from '../utils/errors.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Missing token');
  try {
    const p = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(p.sub), role: p.role, email: p.email };
    next();
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token');
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));