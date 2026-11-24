import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, get } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';
import { Badge, btnPrimary, btnSecondary, EmptyState, ErrorBox, inputCls, Pagination, PRIORITY_TONE, Spinner, STATUS_TONE } from '../components/ui.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { CATEGORIES, PRIORITIES, STATUSES } from '../lib/constants.js';
import { formatDateTime, labelOf } from '../lib/format.js';
import { SAMPLE_FEED } from '../lib/sampleFeed.js';

const EMPTY_FILTERS = { status: '', category: '', priority: '', q: '' };

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function StatsStrip() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => get('/stats') });
  if (stats.isPending) return <Spinner label="Loading stats…" />;
  if (stats.isError) return <ErrorBox error={stats.error} onRetry={stats.refetch} />;

  const s = stats.data;
  const total = Object.values(s.byStatus).reduce((a, b) => a + b, 0);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Total tickets" value={total} />
      <StatCard label="Open" value={s.byStatus.OPEN} />
      <StatCard label="Urgent" value={s.byPriority.URGENT} />
      <StatCard label="Reviewed" value={s.reviewedCount} />
      <StatCard
        label="Model agreement"
        value={s.reviewedCount ? `${s.modelAgreementRate}%` : '—'}
        hint={s.reviewedCount ? 'agents kept the predicted category' : 'no reviewed tickets yet'}
      />
    </div>
  );
}

export default function TriageQueuePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(filters.q);

  const query = { status: filters.status, category: filters.category, priority: filters.priority, q: debouncedQ.trim(), page, limit: 10 };
  const tickets = useQuery({
    queryKey: ['tickets', query],
    queryFn: () => get('/tickets', query),
    placeholderData: keepPreviousData,   // keep the old rows on screen while new filters load
  });

  const setFilter = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1); };

  const importFeed = useMutation({
    mutationFn: (items) => api('POST', '/tickets/import', { body: { tickets: items } }),
    onSuccess: (r) => {
      toast.success(`Imported ${r.importedCount} new, updated ${r.updatedCount}, kept ${r.skippedOverrideCount} human override(s) (of ${r.total}).`);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => toast.error(`Import failed: ${err.message}`),
  });

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      importFeed.mutate(Array.isArray(parsed) ? parsed : parsed.tickets);
    } catch {
      toast.error('That file is not valid JSON.');
    }
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Triage Queue</h1>
        <div className="flex flex-wrap gap-2">
          <button className={btnPrimary} disabled={importFeed.isPending} onClick={() => importFeed.mutate(SAMPLE_FEED)}>
            {importFeed.isPending ? 'Importing…' : 'Re-Import Feed'}
          </button>
          <label className={`${btnSecondary} cursor-pointer`}>
            Import JSON file
            <input type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          </label>
        </div>
      </div>

      <StatsStrip />

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search" aria-label="Search tickets" placeholder="Search subject or body…"
          value={filters.q} onChange={(e) => setFilter('q', e.target.value)} className={`${inputCls} lg:col-span-2`}
        />
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={inputCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}
        </select>
        <select aria-label="Filter by category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className={inputCls}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{labelOf(c)}</option>)}
        </select>
        <select aria-label="Filter by priority" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className={inputCls}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{labelOf(p)}</option>)}
        </select>
        {hasFilters && (
          <button className={`${btnSecondary} sm:col-span-2 lg:col-span-5`} onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>
            Clear filters
          </button>
        )}
      </div>

      {tickets.isPending && <Spinner label="Loading tickets…" />}
      {tickets.isError && <ErrorBox error={tickets.error} onRetry={tickets.refetch} />}
      {tickets.isSuccess && tickets.data.data.length === 0 && (
        <EmptyState title="No tickets match" hint={hasFilters ? 'Try clearing a filter.' : 'Use Re-Import Feed to load tickets.'} />
      )}
      {tickets.isSuccess && tickets.data.data.length > 0 && (
        <>
          <p className="text-sm text-slate-600">{tickets.data.total} ticket{tickets.data.total === 1 ? '' : 's'}</p>
          <ul className={`space-y-3 ${tickets.isPlaceholderData ? 'opacity-60' : ''}`}>
            {tickets.data.data.map((t) => (
              <li key={t.id}>
                <Link to={`/tickets/${t.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-400">
                  {/* Subject and body are rendered as plain React text, so <script> shows up as text */}
                  <p className="break-words font-medium">{t.subject}</p>
                  <p className="mt-1 line-clamp-2 break-words text-sm text-slate-600">{t.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="purple">{labelOf(t.category)}</Badge>
                    <Badge tone={PRIORITY_TONE[t.priority]}>{labelOf(t.priority)}</Badge>
                    <Badge tone={STATUS_TONE[t.status]}>{labelOf(t.status)}</Badge>
                    {t.isHumanOverride && <Badge tone="amber">Human override</Badge>}
                    {t.isReviewed && <Badge tone="green">Reviewed</Badge>}
                    <span className="text-xs text-slate-500">{formatDateTime(t.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={tickets.data.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}