export const toUser = (r) => ({
  id: r.id, name: r.name, email: r.email, role: r.role, createdAt: r.created_at,
});