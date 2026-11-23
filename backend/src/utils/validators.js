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

import { CATEGORIES, PRIORITIES, STATUSES } from './constants.js';

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