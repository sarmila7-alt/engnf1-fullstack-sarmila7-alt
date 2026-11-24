import { useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { get, api } from '../api/client.js';

const emptyForm = {
  name: '',
  type: 'ROOM',
  capacity: '',
  description: '',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function AdminResourcesPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch all resources, including inactive resources
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-resources', search, type, page],

    queryFn: () =>
      get('/resources', {
        search: search.trim(),
        type,
        page,
      }),
  });

  const resources = data?.data || [];
  const totalPages = data?.totalPages || 0;

  // Refresh resource-related queries
  function refreshResources() {
    queryClient.invalidateQueries({
      queryKey: ['admin-resources'],
    });

    queryClient.invalidateQueries({
      queryKey: ['resources'],
    });

    queryClient.invalidateQueries({
      queryKey: ['resource'],
    });

    queryClient.invalidateQueries({
      queryKey: ['admin-stats'],
    });

    queryClient.invalidateQueries({
      queryKey: ['availability'],
    });
  }

  // Create or update resource
  const saveMutation = useMutation({
    mutationFn: ({ id, body }) => {
      if (id !== null) {
        return api('PATCH', `/resources/${id}`, {
          body,
        });
      }

      return api('POST', '/resources', {
        body,
      });
    },

    onSuccess: (_, variables) => {
      setMessage(
        variables.id !== null
          ? 'Resource updated successfully.'
          : 'Resource created successfully.'
      );

      setErrorMessage('');
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      refreshResources();
    },

    onError: (error) => {
      setMessage('');

      setErrorMessage(
        error.message || 'Unable to save resource.'
      );
    },
  });

  // Activate or deactivate resource
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      api('PATCH', `/resources/${id}`, {
        body: { isActive },
      }),

    onSuccess: (_, variables) => {
      setMessage(
        variables.isActive
          ? 'Resource activated successfully.'
          : 'Resource deactivated successfully.'
      );

      setErrorMessage('');
      refreshResources();
    },

    onError: (error) => {
      setMessage('');

      setErrorMessage(
        error.message || 'Unable to update resource status.'
      );
    },
  });

  // Open create resource form
  function openCreateForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMessage('');
    setErrorMessage('');
  }

  // Open edit resource form
  function openEditForm(resource) {
    setEditingId(resource.id);

    setForm({
      name: resource.name,
      type: resource.type,
      capacity: String(resource.capacity),
      description: resource.description || '',
    });

    setShowForm(true);
    setMessage('');
    setErrorMessage('');
  }

  // Close form
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setErrorMessage('');
  }

  // Update individual form fields
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Validate and submit resource form
  function handleSubmit(e) {
    e.preventDefault();

    setMessage('');
    setErrorMessage('');

    const name = form.name.trim();
    const capacity = Number(form.capacity);
    const description = form.description.trim();

    if (name.length < 3 || name.length > 60) {
      setErrorMessage(
        'Resource name must contain 3 to 60 characters.'
      );
      return;
    }

    if (!['ROOM', 'LAB', 'EQUIPMENT'].includes(form.type)) {
      setErrorMessage('Please select a valid resource type.');
      return;
    }

    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 500
    ) {
      setErrorMessage(
        'Capacity must be an integer between 1 and 500.'
      );
      return;
    }

    if (description.length > 300) {
      setErrorMessage(
        'Description cannot exceed 300 characters.'
      );
      return;
    }

    saveMutation.mutate({
      id: editingId,

      body: {
        name,
        type: form.type,
        capacity,
        description,
      },
    });
  }

  // Confirm resource status change
  function handleToggle(resource) {
    const action = resource.isActive
      ? 'deactivate'
      : 'activate';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${resource.name}"?`
    );

    if (!confirmed) return;

    setMessage('');
    setErrorMessage('');

    toggleMutation.mutate({
      id: resource.id,
      isActive: !resource.isActive,
    });
  }

  return (
    <div className="space-y-6">

      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Manage Resources
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create, edit and manage rooms, labs and equipment.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          disabled={saveMutation.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + Add Resource
        </button>

      </div>

      {/* Success message */}
      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {/* Create and edit resource form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h2 className="mb-5 text-xl font-semibold">
            {editingId !== null
              ? 'Edit Resource'
              : 'Create New Resource'}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* Resource name */}
            <div>
              <label
                htmlFor="resource-name"
                className="mb-1 block text-sm font-medium"
              >
                Resource Name
              </label>

              <input
                id="resource-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter resource name"
                minLength={3}
                maxLength={60}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

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
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="ROOM">Room</option>
                  <option value="LAB">Lab</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>

              {/* Resource capacity */}
              <div>
                <label
                  htmlFor="resource-capacity"
                  className="mb-1 block text-sm font-medium"
                >
                  Capacity
                </label>

                <input
                  id="resource-capacity"
                  name="capacity"
                  type="number"
                  value={form.capacity}
                  onChange={handleChange}
                  min={1}
                  max={500}
                  step={1}
                  required
                  placeholder="Enter capacity"
                  className={inputClass}
                />
              </div>

            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="resource-description"
                className="mb-1 block text-sm font-medium"
              >
                Description (Optional)
              </label>

              <textarea
                id="resource-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the resource..."
                rows={4}
                maxLength={300}
                className={inputClass}
              />

              <p className="mt-1 text-right text-xs text-slate-500">
                {form.description.length}/300
              </p>
            </div>

            {/* Form actions */}
            <div className="flex flex-wrap justify-end gap-3">

              <button
                type="button"
                onClick={closeForm}
                disabled={saveMutation.isPending}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saveMutation.isPending
                  ? 'Saving...'
                  : editingId !== null
                  ? 'Update Resource'
                  : 'Create Resource'}
              </button>

            </div>
          </form>
        </div>
      )}

      {/* Search and filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div>
            <label
              htmlFor="admin-resource-search"
              className="mb-1 block text-sm font-medium"
            >
              Search Resources
            </label>

            <input
              id="admin-resource-search"
              type="text"
              value={search}
              placeholder="Search by name..."
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="admin-resource-filter"
              className="mb-1 block text-sm font-medium"
            >
              Filter by Type
            </label>

            <select
              id="admin-resource-filter"
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

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setType('');
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
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
          className="rounded-xl bg-white py-12 text-center"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

          <p className="mt-3 text-sm text-slate-500">
            Loading resources...
          </p>
        </div>
      )}

      {/* Fetch error */}
      {isError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-5"
        >
          <p className="font-semibold text-red-700">
            Failed to load resources
          </p>

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
      {!isPending && !isError && resources.length === 0 && (
        <div className="rounded-xl border bg-white p-10 text-center">

          <h2 className="text-lg font-semibold">
            No resources found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create a resource or change your filters.
          </p>

          <button
            onClick={openCreateForm}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Add Resource
          </button>

        </div>
      )}

      {/* Resource list */}
      {!isPending && !isError && resources.length > 0 && (
        <>

          <p className="text-sm text-slate-500">
            {data.total} resource(s) found
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                {/* Resource status */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {resource.type}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      resource.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {resource.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </span>

                </div>

                {/* Resource information */}
                <h2 className="break-words text-lg font-semibold text-slate-900">
                  {resource.name}
                </h2>

                <p className="mt-2 break-words text-sm text-slate-500">
                  {resource.description ||
                    'No description available.'}
                </p>

                <div className="my-4 rounded-lg bg-slate-50 p-3">

                  <p className="text-xs text-slate-500">
                    Capacity
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {resource.capacity}
                  </p>

                </div>

                <p className="mb-4 text-xs text-slate-500">
                  Created:{' '}
                  {new Date(
                    resource.createdAt
                  ).toLocaleDateString()}
                </p>

                {/* Resource actions */}
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">

                  <button
                    onClick={() => openEditForm(resource)}
                    disabled={
                      saveMutation.isPending ||
                      toggleMutation.isPending
                    }
                    className="flex-1 rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleToggle(resource)}
                    disabled={
                      toggleMutation.isPending ||
                      saveMutation.isPending
                    }
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                      resource.isActive
                        ? 'border-red-300 text-red-600 hover:bg-red-50'
                        : 'border-green-300 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {toggleMutation.isPending &&
                    toggleMutation.variables?.id === resource.id
                      ? 'Updating...'
                      : resource.isActive
                      ? 'Deactivate'
                      : 'Activate'}
                  </button>

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
            onClick={() =>
              setPage((previous) => previous - 1)
            }
            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <span className="text-sm font-medium text-slate-600">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages || isFetching}
            onClick={() =>
              setPage((previous) => previous + 1)
            }
            className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>

        </div>
      )}

    </div>
  );
}