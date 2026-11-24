export const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100';
export const btnPrimary =
  'rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
export const btnSecondary =
  'rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1 break-words text-sm">{error?.message || 'Unknown error'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3 pt-4" aria-label="Pagination">
      <button className={btnSecondary} disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
      <button className={btnSecondary} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  indigo: 'bg-indigo-100 text-indigo-800',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  purple: 'bg-purple-100 text-purple-800',
};

export function Badge({ children, tone = 'slate' }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export const PRIORITY_TONE = { LOW: 'slate', MEDIUM: 'indigo', HIGH: 'amber', URGENT: 'red' };
export const STATUS_TONE = {
  OPEN: 'indigo', IN_PROGRESS: 'amber', RESOLVED: 'green', CLOSED: 'slate',
  PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'slate',
};