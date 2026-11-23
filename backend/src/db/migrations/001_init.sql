CREATE EXTENSION IF NOT EXISTS btree_gist;   -- used for booking overlap in Phase 3
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- used for fast search in Phase 5

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));

CREATE TABLE tickets (
  id                SERIAL PRIMARY KEY,
  external_id       TEXT NOT NULL UNIQUE,
  subject           TEXT NOT NULL,
  body              TEXT NOT NULL,
  auto_category     TEXT NOT NULL CHECK (auto_category IN ('BILLING','BUG','FEATURE_REQUEST','LOGIN','DELIVERY')),
  category          TEXT NOT NULL CHECK (category IN ('BILLING','BUG','FEATURE_REQUEST','LOGIN','DELIVERY')),
  is_human_override BOOLEAN NOT NULL DEFAULT false,
  priority          TEXT NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  status            TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  assignee_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_reviewed       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_events (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  field      TEXT NOT NULL CHECK (field IN ('category','priority','status','assigneeId')),
  old_value  TEXT,
  new_value  TEXT,
  actor      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ticket_events_ticket_idx ON ticket_events (ticket_id, created_at);

CREATE TABLE resources (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('ROOM','LAB','EQUIPMENT')),
  capacity    INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 500),
  description TEXT CHECK (char_length(description) <= 300),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX resources_name_lower_uq ON resources (lower(name));

CREATE TABLE bookings (
  id            SERIAL PRIMARY KEY,
  resource_id   INTEGER NOT NULL REFERENCES resources(id),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  ticket_id     INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  purpose       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  decision_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX bookings_user_idx ON bookings (user_id, status);
CREATE INDEX bookings_resource_time_idx ON bookings (resource_id, start_time);