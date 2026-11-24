import { useQuery } from '@tanstack/react-query';
import { get } from '../api/client.js';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const colors = {
  PENDING: 'bg-yellow-500',
  APPROVED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  CANCELLED: 'bg-slate-500',
};

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => get('/admin/stats'),
  });

  if (isPending) return <p role="status" className="py-10 text-center">Loading analytics...</p>;

  if (isError) return (
    <div role="alert" className="rounded-lg bg-red-50 p-5 text-red-700">
      <p>{error.message || 'Failed to load analytics.'}</p>
      <button onClick={() => refetch()} className="mt-2 underline">Try Again</button>
    </div>
  );

  const bookings = data?.bookingsByStatus || {};
  const total = statuses.reduce((sum, s) => sum + Number(bookings[s] || 0), 0);
  const topResources = data?.topResources || [];
  const ticketStats = data?.ticketStats || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin Analytics</h1>
          <p className="text-sm text-slate-500">Monitor resources, bookings and tickets.</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="rounded-lg border bg-white px-4 py-2 disabled:opacity-50">
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Active Resources" value={data?.activeResources ?? 0} />
        <StatCard label="Total Bookings" value={total} />
        {statuses.map(s => <StatCard key={s} label={s} value={bookings[s] || 0} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Bookings by Status</h2>
          {total === 0 && <p className="text-sm text-slate-500">No booking data available.</p>}
          {statuses.map(s => (
            <div key={s}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{s}</span><span>{bookings[s] || 0}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${colors[s]}`}
                  style={{ width: `${total ? (bookings[s] || 0) / total * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold">Top 3 Resources</h2>
          {!topResources.length && <p className="text-sm text-slate-500">No resource data available.</p>}
          {topResources.slice(0, 3).map((r, i) => (
            <div key={r.resourceId || i} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-4">
              <span className="break-words">{i + 1}. {r.name || r.resourceName || r.resourceId}</span>
              <strong>{r.bookingCount ?? r.count ?? 0}</strong>
            </div>
          ))}
        </section>
      </div>

      <h2 className="text-lg font-semibold">Ticket Statistics</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Object.entries(ticketStats).map(([key, value]) => (
          <StatCard key={key} label={key.replace(/([a-z])([A-Z])/g, '$1 $2')} value={String(value)} />
        ))}
        {!Object.keys(ticketStats).length && <p className="text-slate-500">No ticket data available.</p>}
      </div>
    </div>
  );
}