# TriageSync

A full-stack support ticket triage and resource-slot booking application built with React, Express and PostgreSQL.

## 1. Overview

TriageSync helps support teams organize incoming tickets, review automated classifications, manage shared resources and schedule troubleshooting sessions. It provides separate user and administrator interfaces, resource availability, booking approval workflows and operational analytics.

## 2. Live Links

| Component | Link |
| --- | --- |
| Frontend (Vercel) | [Open TriageSync](https://traigesync-web.vercel.app/) |
| Backend (Render) | [REST API](https://triagesync-api-18xa.onrender.com/) |
| Source code | [GitHub repository](https://github.com/sarmila7-alt/engnf1-fullstack-sarmila7-alt) |
| Database | Neon PostgreSQL |

## 3. Seeded Accounts

| Role | Email | Demo password defined by seed |
| --- | --- | --- |
| ADMIN | `admin@triagesync.test` | `Admin@123` |
| USER | `user@triagesync.test` | `User@123` |

These are development/demo credentials, not production secrets. The seeded USER login previously failed; a separately registered USER account worked. Existing accounts may retain their previous passwords when the seed skips conflicting records. Rotate default administrator credentials before unrestricted public use.

## 4. Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, TanStack React Query |
| Backend | Node.js, Express, REST API |
| Authentication | JWT, bcrypt password hashing |
| Database | PostgreSQL, Neon |
| Deployment | Vercel, Render |
| Version control | Git, GitHub |

## 5. Folder Structure

```text
engnf1-fullstack-sarmila7-alt/
├── backend/
│   ├── scripts/
│   │   └── concurrency-test.mjs
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── TriageQueuePage.jsx
│   │   │   ├── TicketDetailPage.jsx
│   │   │   ├── ResourcesPage.jsx
│   │   │   ├── ResourceDetailPage.jsx
│   │   │   ├── MyBookingsPage.jsx
│   │   │   ├── AdminResourcesPage.jsx
│   │   │   ├── AdminBookingsPage.jsx
│   │   │   └── AdminAnalyticsPage.jsx
│   │   └── App.jsx
│   ├── package.json
│   └── .env.example
├── README.md
├── SOLUTION.md
└── AI_USAGE.md
```

Selected files are shown; this is not an exhaustive repository listing.

## 6. Local Setup and Seed

Prerequisites: Node.js, npm, Git and a PostgreSQL database (local or hosted).

```bash
git clone https://github.com/sarmila7-alt/engnf1-fullstack-sarmila7-alt.git
cd engnf1-fullstack-sarmila7-alt
cd backend
npm install
```

Create `backend/.env` using `.env.example` as the reference:

```dotenv
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_random_secret
PORT=4000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Initialize the database schema using the repository's database initialization procedure. Run `npm run` to inspect the available package scripts; the exact schema initialization command should be confirmed against the backend source.

Seed the database:

```bash
npm run seed
```

The seed is intended to be idempotent. To test repeated execution, run `npm run seed` twice and compare database row counts and unique identifiers. Repeated seed execution was reported complete.

Start the backend:

```bash
npm run dev
```

In a second terminal, from the project root:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev
```

Open http://localhost:5173. The local API runs at http://localhost:4000.

For deployment, use `frontend` as the Vercel root, `npm run build` as the build command and `dist` as the output directory. Set `VITE_API_URL=https://triagesync-api-18xa.onrender.com`. On Render use `backend` as the root and the backend package's start script. Set `CORS_ORIGIN=https://traigesync-web.vercel.app` without a trailing slash. Keep real database credentials and JWT secrets in environment variables, never in Git.

## 7. Database Schema

The logical data model follows the project specification. Field names below describe the API-facing model; consult the database schema for physical column names and constraints.

| Entity | Main fields |
| --- | --- |
| User | id, name, email, passwordHash, role, createdAt |
| Ticket | id, externalId, subject, body, autoCategory, category, isHumanOverride, priority, status, assigneeId, isReviewed, createdAt, updatedAt |
| TicketEvent | id, ticketId, field, oldValue, newValue, actor, createdAt |
| Resource | id, name, type, capacity, description, isActive, createdAt |
| Booking | id, resourceId, userId, ticketId, startTime, endTime, purpose, status, decisionNote, createdAt |

```text
User     1 ─── N Booking
Resource 1 ─── N Booking
Ticket   1 ─── N TicketEvent
Ticket   1 ─── N Booking (optional ticket association)
User     1 ─── N Ticket  (optional assignee)
```

Resource types: ROOM, LAB, EQUIPMENT.

Booking statuses: PENDING, APPROVED, REJECTED, CANCELLED.

Ticket statuses: OPEN, IN_PROGRESS, RESOLVED, CLOSED.

Ticket categories: BILLING, BUG, FEATURE_REQUEST, LOGIN, DELIVERY.

Ticket priorities: LOW, MEDIUM, HIGH, URGENT.

## 8. API Summary

The REST API uses the `/api` prefix and JSON responses. Protected endpoints require authentication; administrator operations require the ADMIN role.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Authenticate an account |
| GET | `/api/tickets` | List and filter tickets |
| GET | `/api/resources` | List resources with filters and pagination |
| GET | `/api/resources/:id` | Resource details |
| POST | `/api/resources` | Create resource (ADMIN) |
| PATCH | `/api/resources/:id` | Update or toggle resource (ADMIN) |
| GET | `/api/resources/:id/availability` | View occupied slots |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings/mine` | List current user's bookings |
| GET | `/api/bookings/:id` | Booking details (owner or ADMIN) |
| GET | `/api/bookings` | List bookings (ADMIN) |
| PATCH | `/api/bookings/:id/cancel` | Cancel an eligible booking (owner) |
| PATCH | `/api/bookings/:id/approve` | Approve booking (ADMIN) |
| PATCH | `/api/bookings/:id/reject` | Reject booking with note (ADMIN) |
| GET | `/api/admin/stats` | Administrative analytics |

Additional authentication and ticket import/review operations are grouped under `/api/auth` and `/api/tickets`. Consult the backend routes for their exact paths and request contracts.

## 9. Features and Testing

- [x] User registration and login
- [x] Administrator login and role-based frontend navigation
- [x] Protected frontend admin routes
- [x] Ticket triage queue and statistics
- [x] Resource listing, detail, search and filter interfaces
- [x] Resource creation and editing
- [x] Resource availability and 30-minute booking slots
- [x] Booking creation, approval, rejection and cancellation
- [x] My Bookings and administrative booking management
- [x] Administrative analytics dashboard
- [x] Concurrent booking tests
- [x] Frontend production build and cloud deployment
- [x] Live login and frontend/backend connectivity

The project owner reports completing the remaining functional testing, including responsive testing. Detailed outputs for every test were not retained in this README.

### Concurrency Test

From the backend directory, with the backend running against a test database:

```bash
node scripts/concurrency-test.mjs
```

Recorded terminal output:

```text
Test 1 - same slot x10 : { '201': 1, '409': 9 }
Test 2 - 3-booking limit : { '201': 3, '409': 7 }
PASS
```

| Scenario | Successful (201) | Conflict (409) | Result |
| --- | ---: | ---: | --- |
| Ten simultaneous requests for the same slot | 1 | 9 | PASS |
| Ten requests testing the three-booking limit | 3 | 7 | PASS |

These results demonstrate conflict prevention and enforcement of the booking limit under the tested workload.

## 10. Known Limitations

- Free-tier hosting may introduce backend cold-start delays.
- Default demo credentials are unsuitable for unrestricted production use.
- Exact schema initialization commands and the complete API inventory should be checked against the current source.
- Detailed database duplicate counts, backend authorization test outputs and before/after API latency measurements are not recorded here. See `SOLUTION.md` for engineering analysis and measured results when available.
- Additional automated regression testing, monitoring and accessibility improvements would strengthen production reliability.

AI assistance is documented separately in `AI_USAGE.md`.
