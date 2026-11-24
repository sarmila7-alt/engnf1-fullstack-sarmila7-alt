import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const LINKS = [
  { to: '/', label: 'Triage Queue', end: true },
  { to: '/resources', label: 'Resources' },
  { to: '/bookings', label: 'My Bookings' },
  { to: '/admin/resources', label: 'Manage Resources', admin: true },
  { to: '/admin/bookings', label: 'All Bookings', admin: true },
  { to: '/admin/analytics', label: 'Analytics', admin: true },
];

const linkCls = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-600 text-white'
      : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <NavLink to="/" className="text-xl font-bold text-blue-700">
              TriageSync
            </NavLink>

            <div className="flex min-w-0 items-center gap-3 text-sm">
              <span className="truncate text-slate-600">{user.name}</span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                {user.role}
              </span>
              <button onClick={logout}
                className="shrink-0 rounded-lg border px-3 py-2 hover:bg-slate-100">
                Log out
              </button>
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Main navigation">
            {LINKS.filter(l => !l.admin || user.role === 'ADMIN').map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}