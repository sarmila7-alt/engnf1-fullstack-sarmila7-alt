import * as auth from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../utils/validators.js';
import { AppError } from '../utils/errors.js';

export async function register(req, res) {
  const user = await auth.register(registerSchema.parse(req.body));
  res.status(201).json({ user });
}

export async function login(req, res) {
  res.json(await auth.login(loginSchema.parse(req.body)));
}

export async function me(req, res) {
  const user = await auth.getUserById(req.user.id);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists');
  res.json({ user });
}