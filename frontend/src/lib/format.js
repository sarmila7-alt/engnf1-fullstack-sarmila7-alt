export const labelOf = (value) =>
  String(value).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// The API sends UTC; people read local time
export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });