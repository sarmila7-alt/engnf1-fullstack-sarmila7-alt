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