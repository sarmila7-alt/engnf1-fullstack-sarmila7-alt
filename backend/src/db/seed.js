import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// 1. Users
await pool.query(
  `INSERT INTO users (name, email, password_hash, role) VALUES
     ('Admin Lead',  'admin@triagesync.test', $1, 'ADMIN'),
     ('Agent Demo',  'user@triagesync.test',  $2, 'USER')
   ON CONFLICT DO NOTHING`,
  [await bcrypt.hash('Admin@123', 10), await bcrypt.hash('User@123', 10)]
);

// 2. Resources: 2 of each type, at least 1 inactive
const resources = [
  ['Conference Room A',   'ROOM',      12, 'Main floor, projector', true],
  ['Board Room B',        'ROOM',      20, 'Video conferencing',    true],
  ['Network Lab',         'LAB',       15, 'Routers and switches',  true],
  ['Hardware Lab',        'LAB',       10, 'Under renovation',      false],
  ['Oscilloscope Rig',    'EQUIPMENT',  1, 'Bench oscilloscope',    true],
  ['Diagnostic Scanner',  'EQUIPMENT',  1, 'Portable scanner',      true],
];
for (const r of resources) {
  await pool.query(
    `INSERT INTO resources (name, type, capacity, description, is_active)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, r);
}

// 3. Tickets: [externalId, subject, body, autoCategory, category, override, priority, status, reviewed]
const tickets = [
  ['EXT-1001', 'Refund for duplicate charge', 'I was charged twice for my March invoice, please refund one payment.',
    'BILLING', 'BILLING', false, 'HIGH', 'IN_PROGRESS', true],
  ['EXT-1002', 'Locked out of my account', 'I am locked out after too many password attempts and need access urgently.',
    'LOGIN', 'LOGIN', false, 'URGENT', 'OPEN', false],
  ['EXT-1003', 'My package has not arrived', 'Order shipped last week and tracking shows no update.',
    'DELIVERY', 'DELIVERY', false, 'HIGH', 'OPEN', false],
  ['EXT-1004', 'App crashes on save', 'Saving a draft throws an exception and the page goes blank.',
    'BUG', 'BUG', false, 'MEDIUM', 'OPEN', false],
  ['EXT-1005', 'Add dark mode', 'It would be great to have a dark theme option in settings.',
    'FEATURE_REQUEST', 'FEATURE_REQUEST', false, 'MEDIUM', 'OPEN', false],
  ['EXT-1006', `<script>alert('xss')</script> Payment page broken`, 'Checkout shows an error <img src=x onerror=alert(1)> when I pay.',
    'BILLING', 'BILLING', false, 'HIGH', 'OPEN', false],
  // agent disagreed with the classifier: gives a real modelAgreementRate later
  ['EXT-1007', 'Cannot sign in after update', 'Sign in fails with an exception since the last release.',
    'LOGIN', 'BUG', true, 'MEDIUM', 'IN_PROGRESS', true],
  ['EXT-1008', 'Production down for all users', 'Our production down incident is blocking agents, 500 on every request.',
    'BUG', 'BUG', false, 'URGENT', 'OPEN', false],
  ['EXT-1009', 'Typo on pricing page', 'The word "monthly" is misspelled in the pricing table.',
    'FEATURE_REQUEST', 'FEATURE_REQUEST', false, 'LOW', 'RESOLVED', true],
  ['EXT-1010', 'Invoice PDF will not download', 'The invoice download button shows an error.',
    'BILLING', 'BILLING', false, 'HIGH', 'IN_PROGRESS', true],
  ['EXT-1011', 'Two factor code never arrives', 'My 2FA code does not come by SMS so I cannot log in.',
    'LOGIN', 'LOGIN', false, 'MEDIUM', 'OPEN', false],
  ['EXT-1012', 'Parcel stuck in transit', 'Tracking has shown the same status for ten days.',
    'DELIVERY', 'DELIVERY', false, 'MEDIUM', 'OPEN', false],
  ['EXT-1013', 'Wrong item delivered', 'The delivery contained a different product than I ordered.',
    'DELIVERY', 'DELIVERY', false, 'MEDIUM', 'RESOLVED', true],
  ['EXT-1014', 'Export report to CSV', 'Please let us export the weekly report to CSV for our finance team.',
    'FEATURE_REQUEST', 'FEATURE_REQUEST', false, 'LOW', 'OPEN', false],
  ['EXT-1015', 'Dashboard layout looks broken', 'The dashboard is broken on mobile and the charts overlap.',
    'BUG', 'BUG', false, 'MEDIUM', 'IN_PROGRESS', false],
  ['EXT-1016', 'Urgent: payment page times out', 'Urgent, the payment page times out for every customer.',
    'BILLING', 'BILLING', false, 'URGENT', 'OPEN', false],
  ['EXT-1017', 'Password reset email was late', 'The reset email arrived late but the issue is now solved.',
    'LOGIN', 'LOGIN', false, 'MEDIUM', 'CLOSED', true],
];

for (const t of tickets) {
  await pool.query(
    `INSERT INTO tickets (external_id, subject, body, auto_category, category,
       is_human_override, priority, status, is_reviewed)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`, t);
}

console.log('Seed complete');
await pool.end();