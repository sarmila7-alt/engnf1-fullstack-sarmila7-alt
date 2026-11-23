export const toUser = (r) => ({
  id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at,
});

export const toTicket = (r) => ({
  id: r.id,
  externalId: r.external_id,
  subject: r.subject,
  body: r.body,
  autoCategory: r.auto_category,
  category: r.category,
  isHumanOverride: r.is_human_override,
  priority: r.priority,
  status: r.status,
  assigneeId: r.assignee_id,
  isReviewed: r.is_reviewed,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toEvent = (r) => ({
  id: r.id,
  ticketId: r.ticket_id,
  field: r.field,
  oldValue: r.old_value,
  newValue: r.new_value,
  actor: r.actor,
  createdAt: r.created_at,
});