import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { stats } from '../controllers/admin.controller.js';

const r = Router();
r.get('/stats', requireAuth, requireRole('ADMIN'), stats);
export default r;