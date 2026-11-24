import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/booking.controller.js';

const r = Router();
r.use(requireAuth);
r.post('/', c.create);
r.get('/mine', c.mine);                       // must be registered BEFORE '/:id'
r.get('/', requireRole('ADMIN'), c.listAll);
r.get('/:id', c.get);
r.patch('/:id/cancel', c.cancel);
r.patch('/:id/approve', requireRole('ADMIN'), c.approve);
r.patch('/:id/reject', requireRole('ADMIN'), c.reject);
export default r;