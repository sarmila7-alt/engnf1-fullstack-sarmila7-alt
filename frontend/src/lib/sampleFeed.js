// This is the REQUEST body for the "Re-Import Feed" button, not data shown on screen.
// It re-sends two seeded tickets unchanged (proving idempotency and override protection)
// plus three new ones. Every screen still shows only what the API returns.
export const SAMPLE_FEED = [
  { externalId: 'EXT-1001', subject: 'Refund for duplicate charge', body: 'I was charged twice for my March invoice, please refund one payment.' },
  { externalId: 'EXT-1007', subject: 'Cannot sign in after update', body: 'Sign in fails with an exception since the last release.' },
  { externalId: 'FEED-2001', subject: 'Shipping label missing', body: 'The tracking number was never emailed to me.' },
  { externalId: 'FEED-2002', subject: 'Server error 500 on export', body: 'Exporting the report returns a 500 error.' },
  { externalId: 'FEED-2003', subject: 'Add keyboard shortcuts', body: 'Power users would love keyboard shortcuts for the queue.' },
];