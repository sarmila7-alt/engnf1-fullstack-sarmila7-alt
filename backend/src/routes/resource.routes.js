import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/resource.controller.js';

const r = Router();
r.use(requireAuth);
r.get('/', c.list);
r.post('/', requireRole('ADMIN'), c.create);
r.get('/:id/availability', c.availability);
r.get('/:id', c.get);
r.patch('/:id', requireRole('ADMIN'), c.patch);
export default r;