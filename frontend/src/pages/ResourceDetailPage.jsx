import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { get, api } from '../api/client.js';

// Convert a date into local YYYY-MM-DD format
function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Generate 30-minute time options
const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = String(Math.floor(i / 2)).padStart(2, '0');
  const minute = i % 2 === 0 ? '00' : '30';

  return `${hour}:${minute}`;
});

// Display timestamps in local timezone
function formatTime(value) {
  return new Date(value).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

export default function ResourceDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const today = new Date();

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  const [date, setDate] = useState(localDate(today));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

  // Fetch resource details
  const resourceQuery = useQuery({
    queryKey: ['resource', id],
    queryFn: () => get(`/resources/${id}`),
  });

  // Calculate selected day's UTC range
  const from = date
    ? new Date(`${date}T00:00:00`)
    : null;

  const to = from ? new Date(from) : null;

  if (to) {
    to.setDate(to.getDate() + 1);
  }

  // Fetch existing bookings
  const availabilityQuery = useQuery({
    queryKey: ['availability', id, date],

    queryFn: () =>
      get(`/resources/${id}/availability`, {
        from: from.toISOString(),
        to: to.toISOString(),
      }),

    enabled: !!date && resourceQuery.isSuccess,
  });

  const resource = resourceQuery.data;

  const bookings =
    availabilityQuery.data?.bookings || [];

  // Create booking
  const bookingMutation = useMutation({
    mutationFn: (bookingData) =>
      api('POST', '/bookings', {
        body: bookingData,
      }),

    onSuccess: () => {
      setMessage(
        'Booking created successfully! Your request is pending admin approval.'
      );

      setErrorMessage('');
      setStartTime('');
      setEndTime('');
      setPurpose('');
      setTicketId('');

      queryClient.invalidateQueries({
        queryKey: ['availability', id],
      });

      queryClient.invalidateQueries({
        queryKey: ['my-bookings'],
      });
    },

    onError: (error) => {
      setMessage('');

      setErrorMessage(
        error.message || 'Unable to create booking.'
      );

      queryClient.invalidateQueries({
        queryKey: ['availability', id],
      });
    },
  });

  // Check whether selected time overlaps another booking
  function isOverlapping(start, end) {
    return bookings.some((booking) => {
      const existingStart = new Date(booking.startTime);
      const existingEnd = new Date(booking.endTime);

      return (
        start < existingEnd &&
        end > existingStart
      );
    });
  }

  // Check whether a 30-minute slot is available
  function isSlotUnavailable(time) {
    const start = new Date(`${date}T${time}:00`);

    const end = new Date(
      start.getTime() + 30 * 60 * 1000
    );

    return (
      start <= new Date() ||
      isOverlapping(start, end)
    );
  }

  // Handle booking form submission
  function handleSubmit(e) {
    e.preventDefault();

    setMessage('');
    setErrorMessage('');

    if (!date || !startTime || !endTime) {
      setErrorMessage(
        'Please select a date, start time and end time.'
      );
      return;
    }

    if (!resource?.isActive) {
      setErrorMessage('This resource is inactive.');
      return;
    }

    const start = new Date(
      `${date}T${startTime}:00`
    );

    const end =
      endTime === '24:00'
        ? new Date(to)
        : new Date(`${date}T${endTime}:00`);

    const duration =
      (end.getTime() - start.getTime()) / 60000;

    if (start <= new Date()) {
      setErrorMessage(
        'Booking start time must be in the future.'
      );
      return;
    }

    const latestStart =
      Date.now() + 30 * 24 * 60 * 60 * 1000;

    if (start.getTime() > latestStart) {
      setErrorMessage(
        'Bookings cannot be made more than 30 days ahead.'
      );
      return;
    }

    if (duration < 30 || duration > 240) {
      setErrorMessage(
        'Booking duration must be between 30 minutes and 4 hours.'
      );
      return;
    }

    if (
      ![0, 30].includes(start.getUTCMinutes()) ||
      ![0, 30].includes(end.getUTCMinutes())
    ) {
      setErrorMessage(
        'Booking times must align with the UTC 30-minute grid.'
      );
      return;
    }

    if (
      purpose.trim().length < 5 ||
      purpose.trim().length > 200
    ) {
      setErrorMessage(
        'Purpose must contain between 5 and 200 characters.'
      );
      return;
    }

    if (isOverlapping(start, end)) {
      setErrorMessage(
        'The selected time overlaps an existing booking.'
      );
      return;
    }

    const bookingData = {
      resourceId: resource.id,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      purpose: purpose.trim(),
    };

    if (ticketId.trim()) {
      bookingData.ticketId = ticketId.trim();
    }

    bookingMutation.mutate(bookingData);
  }

  // Resource loading state
  if (resourceQuery.isPending) {
    return (
      <div className="py-12 text-center text-slate-500">
        Loading resource details...
      </div>
    );
  }

  // Resource error state
  if (resourceQuery.isError) {
    return (
      <div className="space-y-4">
        <Link
          to="/resources"
          className="text-blue-600 hover:underline"
        >
          ← Back to Resources
        </Link>

        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
          {resourceQuery.error?.message ||
            'Failed to load resource.'}

          <button
            onClick={() => resourceQuery.refetch()}
            className="ml-3 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Back button */}
      <Link
        to="/resources"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        ← Back to Resources
      </Link>

      {/* Resource information */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <h1 className="break-words text-2xl font-bold text-slate-900">
            {resource.name}
          </h1>

          <span
            className={`rounded-full px-3 py-1 text-sm ${
              resource.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {resource.isActive ? 'Active' : 'Inactive'}
          </span>

        </div>

        <p className="mt-3 break-words text-slate-600">
          {resource.description ||
            'No description available.'}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Resource Type
            </p>

            <p className="font-semibold">
              {resource.type}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Capacity
            </p>

            <p className="font-semibold">
              {resource.capacity}
            </p>
          </div>

        </div>
      </div>

      {/* Date selection */}
      <div className="rounded-xl border bg-white p-5">

        <label
          htmlFor="booking-date"
          className="mb-2 block font-semibold"
        >
          Select Booking Date
        </label>

        <input
          id="booking-date"
          type="date"
          min={localDate(today)}
          max={localDate(maxDate)}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setStartTime('');
            setEndTime('');
            setMessage('');
            setErrorMessage('');
          }}
          className={`${inputClass} sm:max-w-xs`}
        />

        <p className="mt-2 text-xs text-slate-500">
          All times are displayed in your local timezone.
        </p>

      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Availability section */}
        <div className="min-w-0 rounded-xl border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Resource Availability
          </h2>

          {!date && (
            <p className="text-sm text-slate-500">
              Select a date to view availability.
            </p>
          )}

          {date && availabilityQuery.isPending && (
            <p className="text-slate-500">
              Loading availability...
            </p>
          )}

          {availabilityQuery.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">

              {availabilityQuery.error?.message}

              <button
                onClick={() => availabilityQuery.refetch()}
                className="ml-2 underline"
              >
                Retry
              </button>

            </div>
          )}

          {date && availabilityQuery.isSuccess && (
            <>
              {/* Slot legend */}
              <div className="mb-4 flex flex-wrap gap-4 text-xs">

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-green-200" />
                  Available
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-red-200" />
                  Booked / Past
                </span>

              </div>

              {/* 30-minute slot grid */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">

                {timeSlots.map((time) => {
                  const unavailable =
                    isSlotUnavailable(time);

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={
                        unavailable || !resource.isActive
                      }
                      onClick={() => {
                        setStartTime(time);
                        setEndTime('');
                        setErrorMessage('');
                      }}
                      className={`rounded-lg border p-2 text-xs ${
                        unavailable
                          ? 'cursor-not-allowed border-red-200 bg-red-100 text-red-600'
                          : startTime === time
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-green-200 bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}

              </div>

              {/* Existing bookings */}
              <h3 className="mb-3 mt-6 font-semibold">
                Existing Bookings
              </h3>

              {bookings.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                  No existing bookings for this date.
                </p>
              ) : (
                <div className="space-y-2">

                  {bookings.map((booking, index) => (
                    <div
                      key={`${booking.startTime}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >

                      <div className="text-sm">
                        {formatTime(booking.startTime)}
                        {' — '}
                        {formatTime(booking.endTime)}
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          booking.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {booking.status}
                      </span>

                    </div>
                  ))}

                </div>
              )}
            </>
          )}
        </div>

        {/* Booking form */}
        <div className="min-w-0 rounded-xl border bg-white p-5">

          <h2 className="mb-4 text-lg font-semibold">
            Book This Resource
          </h2>

          {message && (
            <div
              role="status"
              className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
            >
              {message}

              <Link
                to="/bookings"
                className="mt-2 block font-medium underline"
              >
                View My Bookings
              </Link>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          {!resource.isActive && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              This resource is currently inactive.
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Start time */}
            <div>
              <label
                htmlFor="start-time"
                className="mb-1 block text-sm font-medium"
              >
                Start Time
              </label>

              <select
                id="start-time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setEndTime('');
                }}
                required
                className={inputClass}
              >
                <option value="">
                  Select start time
                </option>

                {timeSlots.map((time) => (
                  <option
                    key={time}
                    value={time}
                    disabled={
                      !date || isSlotUnavailable(time)
                    }
                  >
                    {time}
                  </option>
                ))}

              </select>
            </div>

            {/* End time */}
            <div>
              <label
                htmlFor="end-time"
                className="mb-1 block text-sm font-medium"
              >
                End Time
              </label>

              <select
                id="end-time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(e.target.value)
                }
                disabled={!startTime}
                required
                className={inputClass}
              >

                <option value="">
                  Select end time
                </option>

                {[...timeSlots, '24:00']
                  .filter((time) => {
                    if (!startTime || !date) return false;

                    const start = new Date(
                      `${date}T${startTime}:00`
                    );

                    const end =
                      time === '24:00'
                        ? new Date(to)
                        : new Date(`${date}T${time}:00`);

                    const duration =
                      (end - start) / 60000;

                    return (
                      duration >= 30 &&
                      duration <= 240 &&
                      !isOverlapping(start, end)
                    );
                  })
                  .map((time) => (
                    <option key={time} value={time}>
                      {time === '24:00'
                        ? '00:00 (Next day)'
                        : time}
                    </option>
                  ))}

              </select>

              <p className="mt-1 text-xs text-slate-500">
                Minimum 30 minutes, maximum 4 hours.
              </p>

            </div>

            {/* Booking purpose */}
            <div>
              <label
                htmlFor="purpose"
                className="mb-1 block text-sm font-medium"
              >
                Booking Purpose
              </label>

              <textarea
                id="purpose"
                value={purpose}
                onChange={(e) =>
                  setPurpose(e.target.value)
                }
                placeholder="Explain why you need this resource..."
                rows={4}
                minLength={5}
                maxLength={200}
                required
                className={inputClass}
              />

              <p className="text-right text-xs text-slate-500">
                {purpose.length}/200
              </p>
            </div>

            {/* Optional ticket ID */}
            <div>
              <label
                htmlFor="ticket-id"
                className="mb-1 block text-sm font-medium"
              >
                Ticket ID (Optional)
              </label>

              <input
                id="ticket-id"
                type="text"
                value={ticketId}
                onChange={(e) =>
                  setTicketId(e.target.value)
                }
                placeholder="Enter related ticket ID"
                className={inputClass}
              />
            </div>

            {/* Booking rules */}
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">

              <p className="mb-2 font-semibold">
                Booking Rules
              </p>

              <ul className="list-disc space-y-1 pl-5">
                <li>Bookings use 30-minute time slots.</li>
                <li>Maximum duration is 4 hours.</li>
                <li>Bookings must be within 30 days.</li>
                <li>Maximum 3 active future bookings per user.</li>
                <li>New bookings require admin approval.</li>
              </ul>

            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={
                bookingMutation.isPending ||
                !resource.isActive ||
                !availabilityQuery.isSuccess ||
                availabilityQuery.isFetching ||
                !date
              }
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bookingMutation.isPending
                ? 'Creating Booking...'
                : 'Confirm Booking'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}