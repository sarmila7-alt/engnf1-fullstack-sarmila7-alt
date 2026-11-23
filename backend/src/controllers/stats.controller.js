import { getTicketStats } from '../services/stats.service.js';

export async function stats(req, res) {
  res.json(await getTicketStats());
}