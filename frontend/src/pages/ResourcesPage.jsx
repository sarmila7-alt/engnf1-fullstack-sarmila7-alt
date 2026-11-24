import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '../api/client.js';
import { useDebounce } from '../hooks/useDebounce.js';

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [minCapacity, setMinCapacity] = useState('');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  const query = {
    search: debouncedSearch.trim(),
    type,
    minCapacity,
    page,
  };

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['resources', query],
    queryFn: () => get('/resources', query),
  });

  const resources = data?.data || [];
  const totalPages = data?.totalPages || 0;

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

  function resetFilters() {
    setSearch('');
    setType('');
    setMinCapacity('');
    setPage(1);
  }

  function getTypeColor(resourceType) {
    switch (resourceType) {
      case 'ROOM':
        return 'bg-blue-100 text-blue-700';
      case 'LAB':
        return 'bg-purple-100 text-purple-700';
      case 'EQUIPMENT':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Resources
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Browse rooms, labs and equipment available for booking.
        </p>
      </div>

      {/* Search and filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Search */}
          <div>
            <label
              htmlFor="resource-search"
              className="mb-1 block text-sm font-medium"
            >
              Search
            </label>

            <input
              id="resource-search"
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          {/* Resource type */}
          <div>
            <label
              htmlFor="resource-type"
              className="mb-1 block text-sm font-medium"
            >
              Resource Type
            </label>

            <select
              id="resource-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            >
              <option value="">All Types</option>
              <option value="ROOM">Room</option>
              <option value="LAB">Lab</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
          </div>

          {/* Minimum capacity */}
          <div>
            <label
              htmlFor="resource-capacity"
              className="mb-1 block text-sm font-medium"
            >
              Minimum Capacity
            </label>

            <input
              id="resource-capacity"
              type="number"
              min="1"
              max="500"
              placeholder="Any capacity"
              value={minCapacity}
              onChange={(e) => {
                const value = e.target.value;

                if (
                  value === '' ||
                  (Number.isInteger(Number(value)) &&
                    Number(value) >= 1 &&
                    Number(value) <= 500)
                ) {
                  setMinCapacity(value);
                  setPage(1);
                }
              }}
              className={inputClass}
            />
          </div>

          {/* Reset filters */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isPending && (
        <div
          role="status"
          className="rounded-lg bg-white py-12 text-center"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="mt-3 text-sm text-slate-500">
            Loading resources...
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-5"
        >
          <h2 className="font-semibold text-red-700">
            Failed to load resources
          </h2>

          <p className="mt-1 text-sm text-red-600">
            {error?.message || 'Something went wrong.'}
          </p>

          <button
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !isError && resources.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">
            No resources found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Try changing your search or filters.
          </p>

          <button
            onClick={resetFilters}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Resource list */}
      {!isPending && !isError && resources.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              {data.total} resource(s) found
            </p>

            {isFetching && (
              <span className="text-sm text-blue-600">
                Updating...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >

                {/* Resource type and status */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getTypeColor(
                      resource.type
                    )}`}
                  >
                    {resource.type}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      resource.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {resource.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Resource name */}
                <h2 className="break-words text-lg font-semibold text-slate-900">
                  {resource.name}
                </h2>

                {/* Description */}
                <p className="mt-2 break-words text-sm text-slate-500">
                  {resource.description ||
                    'No description available.'}
                </p>

                {/* Capacity */}
                <div className="my-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Capacity
                  </p>

                  <p className="mt-1 font-semibold text-slate-800">
                    {resource.capacity}
                  </p>
                </div>

                {/* Resource detail link */}
                <div className="mt-auto">
                  {resource.isActive ? (
                    <Link
                      to={`/resources/${resource.id}`}
                      className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Availability & Book
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-500"
                    >
                      Resource Inactive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {!isPending && !isError && totalPages > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4">

          <button
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((previous) => previous - 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm font-medium text-slate-600">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((previous) => previous + 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>

        </div>
      )}
    </div>
  );
}