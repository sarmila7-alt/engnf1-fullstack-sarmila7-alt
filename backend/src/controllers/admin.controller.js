import { getAdminStats } from '../services/admin.service.js';

export async function stats(req, res) {
  res.json(await getAdminStats());
}