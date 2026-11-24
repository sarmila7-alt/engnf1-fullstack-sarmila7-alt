import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(64)
    .regex(/[A-Za-z]/, 'must contain a letter')
    .regex(/\d/, 'must contain a digit'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

import { CATEGORIES, PRIORITIES, STATUSES, RESOURCE_TYPES, BOOKING_STATUSES } from './constants.js';

// A NUL character makes Postgres throw (a 500), so reject it as a 400 instead
const text = (min, max) =>
  z.string().trim().min(min).max(max)
    .refine((s) => !s.includes('\u0000'), 'contains an invalid character');

export const ticketInputSchema = z.object({
  externalId: text(1, 100),
  subject: text(3, 150),
  body: text(5, 2000),
});
export const importSchema = z.array(ticketInputSchema).min(1).max(1000);

export const ticketQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  q: text(0, 200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ticketPatchSchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    status: z.enum(STATUSES).optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one of category, priority, status, assigneeId');
  // ---------- Resources & bookings ----------

// Strict ISO 8601 UTC ("...Z"), so the API never has to guess a timezone
const isoUtc = z.string().refine(
  (s) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/.test(s) && !Number.isNaN(Date.parse(s)),
  'must be an ISO 8601 UTC timestamp such as 2026-12-01T10:00:00.000Z'
);
const page = z.coerce.number().int().min(1).default(1);
const capacity = z.number().int().min(1).max(500);

export const resourceCreateSchema = z.object({
  name: text(3, 60),
  type: z.enum(RESOURCE_TYPES),
  capacity,
  description: text(0, 300).nullable().optional(),
});

export const resourcePatchSchema = z
  .object({
    name: text(3, 60).optional(),
    type: z.enum(RESOURCE_TYPES).optional(),
    capacity: capacity.optional(),
    description: text(0, 300).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

export const resourceQuerySchema = z.object({
  search: text(0, 100).optional(),
  type: z.enum(RESOURCE_TYPES).optional(),
  minCapacity: z.coerce.number().int().min(1).max(500).optional(),
  page,
});

export const availabilityQuerySchema = z
  .object({ from: isoUtc, to: isoUtc })
  .refine((q) => Date.parse(q.to) > Date.parse(q.from), 'to must be after from')
  .refine((q) => Date.parse(q.to) - Date.parse(q.from) <= 7 * 24 * 60 * 60 * 1000, 'range must not exceed 7 days');

export const bookingCreateSchema = z.object({
  resourceId: z.number().int().positive(),
  startTime: isoUtc,
  endTime: isoUtc,
  purpose: text(5, 200),
  ticketId: z.number().int().positive().nullable().optional(),
});

export const myBookingsQuerySchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  page,
});

export const adminBookingsQuerySchema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    resourceId: z.coerce.number().int().positive().optional(),
    from: isoUtc.optional(),
    to: isoUtc.optional(),
    page,
  })
  .refine((q) => !q.from || !q.to || Date.parse(q.to) > Date.parse(q.from), 'to must be after from');

export const rejectSchema = z.object({ note: text(5, 200) });