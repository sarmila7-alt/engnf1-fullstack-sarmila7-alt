import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { get, api } from '../api/client.js';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

function formatDateTime(value) {
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyBookingsPage() {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch bookings belonging to the logged-in user
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['my-bookings', status, page],

    queryFn: () =>
      get('/bookings/mine', {
        status,
        page,
      }),
  });

  const bookings = data?.data || [];
  const totalPages = data?.totalPages || 0;

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: (bookingId) =>
      api('PATCH', `/bookings/${bookingId}/cancel`),

    onSuccess: () => {
      setMessage('Booking cancelled successfully.');
      setErrorMessage('');
      setSelectedBooking(null);

      queryClient.invalidateQueries({
        queryKey: ['my-bookings'],
      });

      queryClient.invalidateQueries({
        queryKey: ['availability'],
      });

      queryClient.invalidateQueries({
        queryKey: ['admin-bookings'],
      });

      queryClient.invalidateQueries({
        queryKey: ['admin-stats'],
      });
    },

    onError: (error) => {
      setMessage('');

      setErrorMessage(
        error.message || 'Failed to cancel booking.'
      );

      setSelectedBooking(null);

      queryClient.invalidateQueries({
        queryKey: ['my-bookings'],
      });
    },
  });

  // Only future pending or approved bookings can be cancelled
  function canCancel(booking) {
    return (
      ['PENDING', 'APPROVED'].includes(booking.status) &&
      new Date(booking.startTime).getTime() > Date.now()
    );
  }

  function openCancelConfirmation(booking) {
    setMessage('');
    setErrorMessage('');
    setSelectedBooking(booking);
  }

  function confirmCancellation() {
    if (!selectedBooking) return;

    cancelMutation.mutate(selectedBooking.id);
  }

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            My Bookings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View and manage your resource bookings.
          </p>
        </div>

        <Link
          to="/resources"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Booking
        </Link>

      </div>

      {/* Success message */}
      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {message}

          <button
            onClick={() => setMessage('')}
            aria-label="Dismiss message"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}

          <button
            onClick={() => setErrorMessage('')}
            aria-label="Dismiss error"
            className="font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="flex flex-wrap items-end gap-4">

          <div className="w-full sm:w-64">

            <label
              htmlFor="booking-status"
              className="mb-1 block text-sm font-medium"
            >
              Filter by Status
            </label>

            <select
              id="booking-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

          </div>

          <button
            onClick={() => {
              setStatus('');
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            Reset Filter
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>

        </div>
      </div>

      {/* Loading state */}
      {isPending && (
        <div
          role="status"
          className="rounded-xl bg-white py-12 text-center"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="mt-3 text-sm text-slate-500">
            Loading your bookings...
          </p>
        </div>
      )}

      {/* Fetch error */}
      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-5"
        >
          <h2 className="font-semibold text-red-700">
            Unable to load bookings
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error?.message || 'Something went wrong.'}
          </p>

          <button
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isPending && !isError && bookings.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">

          <h2 className="text-lg font-semibold">
            No bookings found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {status
              ? 'No bookings match the selected status.'
              : 'You have not booked any resources yet.'}
          </p>

          {status ? (
            <button
              onClick={() => {
                setStatus('');
                setPage(1);
              }}
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
            >
              Clear Filter
            </button>
          ) : (
            <Link
              to="/resources"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
            >
              Browse Resources
            </Link>
          )}

        </div>
      )}

      {/* Booking list */}
      {!isPending && !isError && bookings.length > 0 && (
        <>

          <p className="text-sm text-slate-500">
            {data.total} booking(s) found
          </p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                {/* Resource name and booking status */}
                <div className="flex flex-wrap items-center justify-between gap-2">

                  <h2 className="break-words text-lg font-semibold text-slate-900">
                    {booking.resourceName ||
                      booking.resourceId}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      statusColors[booking.status] ||
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {booking.status}
                  </span>

                </div>

                {/* Booking ID */}
                <p className="mt-2 break-all text-xs text-slate-400">
                  Booking ID: {booking.id}
                </p>

                {/* Start and end time */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Start Time
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(booking.startTime)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      End Time
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(booking.endTime)}
                    </p>
                  </div>

                </div>

                {/* Booking purpose */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500">
                    Purpose
                  </p>

                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
                    {booking.purpose}
                  </p>
                </div>

                {/* Related ticket */}
                {booking.ticketId && (
                  <div className="mt-4">

                    <p className="text-xs text-slate-500">
                      Related Ticket
                    </p>

                    <Link
                      to={`/tickets/${booking.ticketId}`}
                      className="break-all text-sm text-blue-600 hover:underline"
                    >
                      {booking.ticketId}
                    </Link>

                  </div>
                )}

                {/* Admin decision note */}
                {booking.decisionNote && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">

                    <p className="text-xs font-semibold text-slate-600">
                      Admin Decision Note
                    </p>

                    <p className="mt-1 break-words text-sm text-slate-700">
                      {booking.decisionNote}
                    </p>

                  </div>
                )}

                {/* Created date */}
                <p className="my-4 text-xs text-slate-500">
                  Created: {formatDateTime(booking.createdAt)}
                </p>

                {/* Booking actions */}
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">

                  <Link
                    to={`/resources/${booking.resourceId}`}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
                  >
                    View Resource
                  </Link>

                  {canCancel(booking) && (
                    <button
                      onClick={() =>
                        openCancelConfirmation(booking)
                      }
                      disabled={cancelMutation.isPending}
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Cancel Booking
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
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm font-medium text-slate-600">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>

        </div>
      )}

      {/* Cancellation confirmation modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            aria-describedby="cancel-description"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >

            <h2
              id="cancel-title"
              className="text-xl font-semibold text-slate-900"
            >
              Cancel Booking?
            </h2>

            <p
              id="cancel-description"
              className="mt-3 text-sm text-slate-600"
            >
              Are you sure you want to cancel your booking
              for{' '}
              <strong>
                {selectedBooking.resourceName ||
                  selectedBooking.resourceId}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">

              <p>
                Start: {formatDateTime(selectedBooking.startTime)}
              </p>

              <p className="mt-1">
                End: {formatDateTime(selectedBooking.endTime)}
              </p>

            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">

              <button
                onClick={() => setSelectedBooking(null)}
                disabled={cancelMutation.isPending}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                Keep Booking
              </button>

              <button
                onClick={confirmCancellation}
                disabled={cancelMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelMutation.isPending
                  ? 'Cancelling...'
                  : 'Yes, Cancel Booking'}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}