-- Two bookings of the same resource may not overlap while they are PENDING or APPROVED.
-- '[)' makes the range half-open, so back-to-back bookings (10:00-10:30, 10:30-11:00) are allowed.
-- Rows that are REJECTED or CANCELLED fall outside the WHERE clause and free the slot.
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status IN ('PENDING', 'APPROVED'));