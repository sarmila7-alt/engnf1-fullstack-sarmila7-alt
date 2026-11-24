import * as bookings from '../services/booking.service.js';
import {
  bookingCreateSchema, myBookingsQuerySchema, adminBookingsQuerySchema, rejectSchema,
} from '../utils/validators.js';
import { parseId } from '../utils/params.js';

const idOf = (req) => parseId(req.params.id, 'Booking');

export async function create(req, res) {
  res.status(201).json(await bookings.createBooking(req.user.id, bookingCreateSchema.parse(req.body)));
}

export async function mine(req, res) {
  res.json(await bookings.listMine(req.user.id, myBookingsQuerySchema.parse(req.query)));
}

export async function listAll(req, res) {
  res.json(await bookings.listAll(adminBookingsQuerySchema.parse(req.query)));
}

export async function get(req, res) {
  res.json(await bookings.getBooking(idOf(req), req.user));
}

export async function cancel(req, res) {
  res.json(await bookings.cancelBooking(idOf(req), req.user));
}

export async function approve(req, res) {
  res.json(await bookings.approveBooking(idOf(req)));
}

export async function reject(req, res) {
  const id = idOf(req);
  await bookings.bookingExists(id);                         // 404 (path id) before 400 (note)
  const { note } = rejectSchema.parse(req.body);
  res.json(await bookings.rejectBooking(id, note));
}