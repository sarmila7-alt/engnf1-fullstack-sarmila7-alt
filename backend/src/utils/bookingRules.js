import { AppError } from './errors.js';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const onGrid = (d) =>
  d.getUTCMinutes() % 30 === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

export function validateBookingWindow(startIso, endIso, now = new Date()) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fail = (message) => { throw new AppError(400, 'VALIDATION_ERROR', message); };

  if (!onGrid(start) || !onGrid(end)) fail('startTime and endTime must fall on :00 or :30 (UTC)');
  const minutes = (end - start) / MINUTE;
  if (minutes < 30 || minutes > 240) fail('Duration must be between 30 and 240 minutes');
  if (start <= now) fail('startTime must be in the future');
  if (start - now > 30 * DAY) fail('startTime must be at most 30 days ahead');
  return { start, end };
}