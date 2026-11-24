import * as resources from '../services/resource.service.js';
import {
  resourceQuerySchema, resourceCreateSchema, resourcePatchSchema, availabilityQuerySchema,
} from '../utils/validators.js';
import { parseId } from '../utils/params.js';

const idOf = (req) => parseId(req.params.id, 'Resource');

export async function list(req, res) {
  res.json(await resources.listResources(resourceQuerySchema.parse(req.query), req.user.role));
}

export async function get(req, res) {
  res.json(await resources.getResource(idOf(req), req.user.role));
}

export async function create(req, res) {
  res.status(201).json(await resources.createResource(resourceCreateSchema.parse(req.body)));
}

export async function patch(req, res) {
  const id = idOf(req);
  await resources.resourceExists(id);                       // 404 (path id) before 400 (body)
  res.json(await resources.updateResource(id, resourcePatchSchema.parse(req.body)));
}

export async function availability(req, res) {
  const id = idOf(req);
  await resources.getResource(id, req.user.role);           // 404 first (also hides inactive from USER)
  const { from, to } = availabilityQuerySchema.parse(req.query);
  res.json(await resources.getAvailability(id, from, to));
}