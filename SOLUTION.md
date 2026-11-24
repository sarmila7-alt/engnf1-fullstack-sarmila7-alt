# TriageSync — Engineering Solution

## Part A — Architecture and ticket trace

```text
Browser (React / Vite / Tailwind, Vercel)
  | HTTPS / JSON, JWT
  v
Express REST API (Render)
  | routes -> authentication -> controllers -> services
  v
PostgreSQL (Neon)
  | users, tickets, ticket_events, resources, bookings
  v
JSON responses -> React Query cache -> dashboard
```

Live frontend: https://traigesync-web.vercel.app/  
Live backend: https://triagesync-api-18xa.onrender.com/

### Function-by-function trace

Source references below refer to the uploaded repository snapshot; verify line numbers against the final commit.

1. `frontend/src/pages/TriageQueuePage.jsx:62–70`: the `importFeed` mutation sends `POST /api/tickets/import` with a `tickets` array through the API client.
2. `backend/src/controllers/ticket.controller.js:14–17`: `importFeed()` extracts the array, validates it with `importSchema.parse()` and calls `importTickets()`.
3. `backend/src/services/ticket.service.js:6–22`: `importTickets()` opens a transaction, calls `classify()` for each item and inserts new tickets using parameterized SQL and `ON CONFLICT (external_id) DO NOTHING`.
4. `backend/src/services/triage.service.js:13–30`: `classify()` combines subject and body, lowercases the text and uses `firstMatch()` and `hasKeyword()` to select category and priority. Defaults are FEATURE_REQUEST and MEDIUM. This is rule-based classification, not a trained ML model.
5. `ticket.service.js:24–49`: existing rows are locked and updated according to the override flag; the transaction commits after processing the feed.
6. `TriageQueuePage.jsx:64–67`: a successful import displays counters and invalidates the tickets and stats caches.
7. `ticket.controller.js:19–21` and `ticket.service.js:76–105`: `list()` validates query parameters and `listTickets()` combines filters, escapes LIKE wildcards, binds values, executes count and page queries concurrently, and serializes the results. Results are ordered by creation time and ID descending.
8. `TriageQueuePage.jsx:53–58`: React Query retrieves the ticket page; `StatsStrip()` at lines 24–40 retrieves `/api/stats` and displays aggregate counts.
9. `backend/src/services/stats.service.js:7–23`: `getTicketStats()` groups tickets and calculates reviewed count and agreement rate.

### Review and audit history

`updateTicket()` (`ticket.service.js:108–160`) locks the ticket row, compares old and new field values, updates changed fields and inserts corresponding `ticket_events` records in the same transaction. The controller derives the actor from X-Agent or the authenticated user's email.

A ticket becomes reviewed when a PATCH includes the category field (even if unchanged), or moves its status away from OPEN. Once set, the reviewed flag is retained by this update logic. An actual category change sets the human-override flag.

Agreement rate = 100 × reviewed tickets whose category equals auto_category / total reviewed tickets. The service returns zero when there are no reviewed tickets; the frontend displays a dash in that case. The observed local dashboard showed 17 tickets, 6 reviewed and 83.3% agreement.

## Part B — Concurrency and idempotent human overrides

### Booking concurrency (B6)

`backend/src/services/booking.service.js:22–68`, `createBooking()`, validates the booking window, opens a database transaction, checks resource and optional ticket existence, and rejects inactive resources.

Two distinct concurrency mechanisms protect bookings:

- **Overlapping resource slots:** `backend/src/db/migrations/002_booking_overlap.sql:4–9` defines a PostgreSQL GiST exclusion constraint on resource ID and overlapping timestamp ranges. Only PENDING and APPROVED bookings participate. The half-open `[)` range permits adjacent bookings. PostgreSQL atomically rejects conflicting inserts, including requests from different users or server instances. The service rolls back and maps SQLSTATE 23P01 to HTTP 409.
- **Three upcoming bookings per user:** `booking.service.js:41–56` obtains a transaction-scoped advisory lock keyed by user ID before counting future PENDING/APPROVED bookings and inserting. Requests for the same user serialize, avoiding a count-then-insert race. The lock releases at commit or rollback.

`transition()` at lines 123–139 locks the booking row during status changes, preventing competing approval and cancellation operations from interleaving.

### Actual concurrency test

Command from backend directory:

```bash
node scripts/concurrency-test.mjs
```

Reported terminal output:

```text
Test 1 - same slot x10 : { '201': 1, '409': 9 }
Test 2 - 3-booking limit : { '201': 3, '409': 7 }
PASS
```

Both tested concurrency scenarios passed. These results do not establish correctness for every possible workload.

### Human-override protection (T-B2)

`ticket.service.js:6–49` uses the unique external ID and conflict-safe insert to prevent duplicate tickets. Existing rows are locked with `SELECT ... FOR UPDATE`, coordinating with agent PATCH operations. If `is_human_override` is true, only changed subject/body text and timestamp are updated; category and priority are preserved. Otherwise, changed text triggers reclassification. Repeated identical imports avoid unnecessary row updates, although the updated counter includes existing non-overridden tickets even when unchanged.

One limitation to verify against the final code and specification: the inspected snapshot updates `auto_category` on re-import of changed, non-overridden tickets (lines 41–45). If the original prediction must remain immutable, this behavior needs review. No claim is made that this discrepancy has been fixed.

## Part C — Measure First, Then Optimise

Endpoint: `GET /api/tickets?limit=100`.

The benchmark used the local Express API connected to the existing Neon PostgreSQL database. 500 synthetic tickets were inserted, bringing the total to 517. The same authenticated endpoint was warmed up with three requests and measured with 20 sequential PowerShell requests per run, using `Measure-Command`.

| Measurement | Before | After |
|---|---:|---:|
| Ticket count | 517 | 517 |
| Mean latency (ms) | 461.07 | 346.40 |
| Minimum latency (ms) | 285.65 | 279.03 |
| Maximum latency (ms) | 1017.49 | 551.10 |

Mean latency decreased by 114.67 ms (24.87%). The second run's count was not included in the pasted output; the instructed procedure used 20 requests. Median and P95 were not captured.

The `listTickets()` service already uses pagination, parameterized filters and parallel count/data queries. The optimization tested was a composite index matching the list query's sort order, followed by refreshed table statistics:

```sql
CREATE INDEX IF NOT EXISTS tickets_created_id_idx
ON tickets (created_at DESC, id DESC);
ANALYZE tickets;
```

The index can reduce sorting work for ordered page retrieval, but increases storage and write maintenance costs. It does not necessarily accelerate the separate total count or substring searches. PostgreSQL may still prefer a sequential scan for small tables. The measured improvement is an end-to-end observation, not proof that the index alone caused it: network latency, caching and refreshed statistics may contribute. No execution plan was captured to verify index usage.

For reproducibility, retain the index definition in a database migration and repeat the benchmark on an isolated database if further validation is needed. Synthetic tickets should be removed after testing.

## Part D — Improvements with one more day

| Source reference (uploaded snapshot) | Improvement |
|---|---|
| `backend/src/services/ticket.service.js:41–45` | Verify immutable original classification behavior and add re-import regression tests. |
| `backend/src/services/ticket.service.js:76–105` | Benchmark list queries and choose indexes based on execution plans. |
| `backend/src/services/booking.service.js:22–68` | Extend concurrency tests across different users, resources and adjacent time slots. |
| `backend/src/services/booking.service.js:123–139` | Test competing booking status transitions and authorization. |
| `frontend/src/pages/TriageQueuePage.jsx:53–70` | Expand automated tests for filters, pagination, import failures and cache refresh. |

### Deployment and verification notes

The frontend and backend were deployed on Vercel and Render, respectively, with Neon PostgreSQL. Deployment issues included a case-sensitive filename mismatch and a CORS origin with a trailing slash. Both were corrected, and live login was reported working. The developer subsequently reported completion of testing. Detailed production test outputs were not supplied. The local API performance measurements are recorded in Part C.

Before treating the application as production-ready, rotate default administrator credentials, verify backend authorization independently and retain benchmark and regression-test evidence.
