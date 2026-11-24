import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Badge, btnSecondary, EmptyState, ErrorBox, inputCls, PRIORITY_TONE, Spinner, STATUS_TONE } from '../components/ui.jsx';
import { CATEGORIES, PRIORITIES, STATUSES } from '../lib/constants.js';
import { formatDateTime, labelOf } from '../lib/format.js';

const FIELD_LABEL = { category: 'Category', priority: 'Priority', status: 'Status', assigneeId: 'Assignee' };

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = ['ticket', id];

  const detail = useQuery({ queryKey: key, queryFn: () => get(`/tickets/${id}`) });

  // Optimistic update: the screen changes immediately, and is rolled back if the server says no
  const update = useMutation({
    mutationFn: (changes) => api('PATCH', `/tickets/${id}`, { body: changes }),

    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: key });          // stop a refetch overwriting our guess
      const previous = queryClient.getQueryData(key);              // snapshot for rollback
      if (previous) {
        const t = previous.ticket;
        const now = new Date().toISOString();
        const events = Object.entries(changes)
          .filter(([field, value]) => t[field] !== value)
          .map(([field, value]) => ({
            id: `optimistic-${field}-${now}`, ticketId: t.id, field,
            oldValue: t[field] == null ? null : String(t[field]),
            newValue: value == null ? null : String(value),
            actor: user.email, createdAt: now,
          }));
        queryClient.setQueryData(key, {
          // the same rules the server applies (T-B3), predicted locally
          ticket: {
            ...t, ...changes,
            isHumanOverride: t.isHumanOverride || ('category' in changes && changes.category !== t.category),
            isReviewed: t.isReviewed || 'category' in changes
              || (t.status === 'OPEN' && changes.status !== undefined && changes.status !== 'OPEN'),
          },
          events: [...events, ...previous.events],
        });
      }
      return { previous };
    },

    onError: (err, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);   // roll back
      toast.error(`Update failed: ${err.message} Your change was reverted.`);
    },

    onSettled: () => {   // success or failure: re-sync with the server's truth
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  if (detail.isPending) return <Spinner label="Loading ticket…" />;
  if (detail.isError) {
    return (
      <div className="space-y-4">
        <Link to="/" className="text-sm font-medium text-indigo-700 hover:underline">← Back to queue</Link>
        <ErrorBox error={detail.error} onRetry={detail.refetch} />
      </div>
    );
  }

  const { ticket, events } = detail.data;
  const mine = ticket.assigneeId === user.id;

  return (
    <div className="space-y-5">
      <Link to="/" className="text-sm font-medium text-indigo-700 hover:underline">← Back to queue</Link>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="purple">{labelOf(ticket.category)}</Badge>
          <Badge tone={PRIORITY_TONE[ticket.priority]}>{labelOf(ticket.priority)}</Badge>
          <Badge tone={STATUS_TONE[ticket.status]}>{labelOf(ticket.status)}</Badge>
          {ticket.isHumanOverride && <Badge tone="amber">Human override</Badge>}
          {ticket.isReviewed && <Badge tone="green">Reviewed</Badge>}
        </div>
        <h1 className="mt-3 break-words text-xl font-semibold">{ticket.subject}</h1>
        <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">{ticket.body}</p>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div><dt className="inline font-medium">External id: </dt><dd className="inline break-all">{ticket.externalId}</dd></div>
          <div><dt className="inline font-medium">Predicted category: </dt><dd className="inline">{labelOf(ticket.autoCategory)}</dd></div>
          <div><dt className="inline font-medium">Created: </dt><dd className="inline">{formatDateTime(ticket.createdAt)}</dd></div>
          <div><dt className="inline font-medium">Updated: </dt><dd className="inline">{formatDateTime(ticket.updatedAt)}</dd></div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Review</h2>
        {update.isError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            The server rejected your last change: {update.error.message} It has been reverted.
          </p>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <select value={ticket.category} onChange={(e) => update.mutate({ category: e.target.value })} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{labelOf(c)}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select value={ticket.priority} onChange={(e) => update.mutate({ priority: e.target.value })} className={inputCls}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{labelOf(p)}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={ticket.status} onChange={(e) => update.mutate({ status: e.target.value })} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span>
            Assignee: <strong>{ticket.assigneeId == null ? 'nobody' : mine ? 'you' : `user #${ticket.assigneeId}`}</strong>
          </span>
          <button className={btnSecondary} onClick={() => update.mutate({ assigneeId: mine ? null : user.id })}>
            {mine ? 'Unassign me' : 'Assign to me'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Audit history</h2>
        {events.length === 0 ? (
          <div className="mt-3"><EmptyState title="No changes yet" hint="Edits to category, priority, status or assignee appear here." /></div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {events.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <span className="font-medium">{FIELD_LABEL[e.field] || e.field}</span>:{' '}
                <span className="break-words">{e.oldValue ?? '—'}</span> → <span className="break-words">{e.newValue ?? '—'}</span>
                <div className="break-words text-xs text-slate-500">by {e.actor} · {formatDateTime(e.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}