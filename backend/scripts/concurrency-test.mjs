// Usage (from backend/):  node scripts/concurrency-test.mjs
//         against live:   $env:BASE_URL="https://your-api.onrender.com"; node scripts/concurrency-test.mjs
// Proves rule B6 (one winner for one slot) and the 3-booking limit under concurrent load.
const BASE = process.env.BASE_URL || 'http://localhost:4000';

async function api(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function newUser(tag) {
  const email = `race-${Date.now()}-${tag}@example.com`;
  const password = 'Passw0rd1';
  await api('POST', '/api/auth/register', { name: `Race ${tag}`, email, password });
  const login = await api('POST', '/api/auth/login', { email, password });
  return login.body.token;
}

const tally = (results) =>
  results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

function slot(daysAhead, hour) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysAhead);
  start.setUTCHours(hour, 0, 0, 0);
  return { startTime: start.toISOString(), endTime: new Date(start.getTime() + 30 * 60000).toISOString() };
}

const demo = await api('POST', '/api/auth/login', { email: 'user@triagesync.test', password: 'User@123' });
const resources = await api('GET', '/api/resources', null, demo.body.token);
const resourceId = resources.body.data[0].id;

// Random days so re-running the script never collides with its own earlier bookings
const dayA = 3 + Math.floor(Math.random() * 12);
const dayB = 16 + Math.floor(Math.random() * 12);
let failed = false;

// TEST 1: 10 different users, the SAME slot, at the same instant -> exactly one 201
const tokens = await Promise.all(Array.from({ length: 10 }, (_, i) => newUser(`a${i}`)));
const same = await Promise.all(tokens.map((t) =>
  api('POST', '/api/bookings', { resourceId, ...slot(dayA, 9), purpose: 'Concurrency test' }, t)));
const t1 = tally(same);
console.log('Test 1 - same slot x10 :', t1);
if (t1[201] !== 1 || t1[409] !== 9) failed = true;

// TEST 2: ONE user, 10 DIFFERENT slots at once -> the limit of 3 must hold
const solo = await newUser('solo');
const many = await Promise.all(Array.from({ length: 10 }, (_, i) =>
  api('POST', '/api/bookings', { resourceId, ...slot(dayB, 8 + i), purpose: 'Limit test' }, solo)));
const t2 = tally(many);
console.log('Test 2 - 3-booking limit :', t2);
if (t2[201] !== 3 || t2[409] !== 7) failed = true;

console.log(failed ? 'FAIL' : 'PASS');
process.exit(failed ? 1 : 0);