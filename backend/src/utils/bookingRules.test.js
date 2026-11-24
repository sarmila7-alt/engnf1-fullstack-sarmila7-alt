import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBookingWindow } from './bookingRules.js';

const now = new Date('2026-12-01T08:10:00.000Z');
const ok = (s, e) => validateBookingWindow(s, e, now);
const bad = (s, e) => assert.throws(() => ok(s, e), { code: 'VALIDATION_ERROR', status: 400 });

test('a valid 60 minute slot passes', () => {
  assert.doesNotThrow(() => ok('2026-12-01T10:00:00.000Z', '2026-12-01T11:00:00.000Z'));
});
test('30 and 240 minutes are allowed (inclusive)', () => {
  assert.doesNotThrow(() => ok('2026-12-01T10:00:00.000Z', '2026-12-01T10:30:00.000Z'));
  assert.doesNotThrow(() => ok('2026-12-01T10:00:00.000Z', '2026-12-01T14:00:00.000Z'));
});
test('off-grid minutes, seconds or milliseconds are rejected', () => {
  bad('2026-12-01T10:15:00.000Z', '2026-12-01T11:00:00.000Z');
  bad('2026-12-01T10:00:30.000Z', '2026-12-01T11:00:00.000Z');
  bad('2026-12-01T10:00:00.500Z', '2026-12-01T11:00:00.000Z');
});
test('too short, too long, zero or negative durations are rejected', () => {
  bad('2026-12-01T10:00:00.000Z', '2026-12-01T10:00:00.000Z');
  bad('2026-12-01T10:00:00.000Z', '2026-12-01T14:30:00.000Z');
  bad('2026-12-01T11:00:00.000Z', '2026-12-01T10:00:00.000Z');
});
test('start in the past is rejected', () => {
  bad('2026-12-01T08:00:00.000Z', '2026-12-01T09:00:00.000Z');
});
test('start exactly 30 days ahead is allowed, later is rejected', () => {
  assert.doesNotThrow(() => ok('2026-12-31T08:00:00.000Z', '2026-12-31T09:00:00.000Z'));
  bad('2026-12-31T08:30:00.000Z', '2026-12-31T09:00:00.000Z');
});