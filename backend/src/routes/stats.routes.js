import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { stats } from '../controllers/stats.controller.js';

const r = Router();
r.get('/', requireAuth, stats);
export default r;