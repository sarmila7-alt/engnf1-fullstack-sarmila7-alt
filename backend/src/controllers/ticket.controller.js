import * as tickets from '../services/ticket.service.js';
import { importSchema, ticketQuerySchema, ticketPatchSchema } from '../utils/validators.js';
import { AppError } from '../utils/errors.js';

function parseId(raw) {
  if (!/^\d+$/.test(raw) || Number(raw) > 2147483647 || Number(raw) < 1) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  }
  return Number(raw);
}

const actorOf = (req) => (req.get('X-Agent') || '').trim().slice(0, 100) || req.user.email;

export async function importFeed(req, res) {
  const payload = Array.isArray(req.body) ? req.body : req.body?.tickets;
  res.json(await tickets.importTickets(importSchema.parse(payload)));
}

export async function list(req, res) {
  res.json(await tickets.listTickets(ticketQuerySchema.parse(req.query)));
}

export async function get(req, res) {
  res.json(await tickets.getTicket(parseId(req.params.id)));
}

export async function patch(req, res) {
  const id = parseId(req.params.id);
  await tickets.ticketExists(id);                   // 404 (path id) comes before 400 (validation)
  const changes = ticketPatchSchema.parse(req.body);
  res.json(await tickets.updateTicket(id, changes, actorOf(req)));
}