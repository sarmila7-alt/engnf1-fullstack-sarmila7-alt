import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/ticket.controller.js';

const r = Router();
r.use(requireAuth);
r.post('/import', c.importFeed);
r.get('/', c.list);
r.get('/:id', c.get);
r.patch('/:id', c.patch);
export default r;