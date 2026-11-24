import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, api } from '../api/client.js';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const colors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

const input = 'w-full rounded-lg border p-2';
const formatDate = value => new Date(value).toLocaleString();

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data, isPending, isError, error: fetchError, refetch } = useQuery({
    queryKey: ['admin-bookings', status, resourceId, from, to, page],
    queryFn: () => get('/bookings', {
      status: status || undefined,
      resourceId: resourceId || undefined,
      page,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
    }),
  });

  const mutation = useMutation({
    mutationFn: ({ id, action, note }) =>
      api('PATCH', `/bookings/${id}/${action}`, {
        body: action === 'reject' ? { note } : undefined,
      }),
    onSuccess: () => {
      setMessage('Booking updated successfully.');
      setError('');
      ['admin-bookings', 'my-bookings', 'availability', 'admin-stats']
        .forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
    },
    onError: err => setError(err.message),
  });

  function handleDecision(id, action) {
    setMessage('');
    setError('');
    let note;

    if (action === 'reject') {
      note = window.prompt('Enter rejection reason (5-200 characters):');
      if (note === null) return;
      note = note.trim();

      if (note.length < 5 || note.length > 200) {
        setError('Rejection reason must contain 5-200 characters.');
        return;
      }
    } else if (!window.confirm('Approve this booking?')) return;

    mutation.mutate({ id, action, note });
  }

  function resetFilters() {
    setStatus('');
    setResourceId('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  const bookings = data?.data || [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Manage Bookings</h1>
      <p className="text-slate-500">Review and manage resource booking requests.</p>

      {message && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{message}</p>}
      {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">Status
          <select className={input} value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>

        <label className="text-sm">Resource ID
          <input className={input} type="text" value={resourceId}
            onChange={e => { setResourceId(e.target.value); setPage(1); }} />
        </label>

        <label className="text-sm">From
          <input className={input} type="datetime-local" value={from}
            onChange={e => { setFrom(e.target.value); setPage(1); }} />
        </label>

        <label className="text-sm">To
          <input className={input} type="datetime-local" value={to}
            onChange={e => { setTo(e.target.value); setPage(1); }} />
        </label>

        <button onClick={resetFilters} className="self-end rounded-lg border p-2">
          Reset Filters
        </button>
      </div>

      {isPending && <p role="status" className="py-10 text-center">Loading bookings...</p>}

      {isError && (
        <div role="alert" className="rounded bg-red-50 p-4 text-red-700">
          {fetchError.message}
          <button onClick={() => refetch()} className="ml-2 underline">Retry</button>
        </div>
      )}

      {!isPending && !isError && bookings.length === 0 && (
        <p className="rounded border bg-white p-10 text-center">No bookings found.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {bookings.map(b => (
          <div key={b.id} className="min-w-0 space-y-3 rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="break-all font-semibold">{b.resourceName || b.resourceId}</h2>
              <span className={`rounded-full px-3 py-1 text-xs ${colors[b.status]}`}>
                {b.status}
              </span>
            </div>

            <p className="break-all text-sm text-slate-500">Booking: {b.id}</p>
            <p className="break-all text-sm text-slate-500">User: {b.userId}</p>
            <p className="text-sm">Start: {formatDate(b.startTime)}</p>
            <p className="text-sm">End: {formatDate(b.endTime)}</p>
            <p className="break-words text-sm">Purpose: {b.purpose}</p>
            {b.ticketId && <p className="break-all text-sm">Ticket ID: {b.ticketId}</p>}
            {b.decisionNote && <p className="break-words rounded bg-slate-100 p-2 text-sm">Note: {b.decisionNote}</p>}

            {b.status === 'PENDING' && (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <button disabled={mutation.isPending}
                  onClick={() => handleDecision(b.id, 'approve')}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                  Approve
                </button>
                <button disabled={mutation.isPending}
                  onClick={() => handleDecision(b.id, 'reject')}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {data?.totalPages > 0 && (
        <div className="flex items-center justify-center gap-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded border px-3 py-2 disabled:opacity-50">Previous</button>
          <span className="text-sm">Page {page} of {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded border px-3 py-2 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}