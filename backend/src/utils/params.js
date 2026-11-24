import { AppError } from './errors.js';

// A path id that is not a positive 32-bit integer can never exist, so it is a 404, not a 500
export function parseId(raw, label) {
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || n < 1 || n > 2147483647) {
    throw new AppError(404, 'NOT_FOUND', `${label} not found`);
  }
  return n;
}