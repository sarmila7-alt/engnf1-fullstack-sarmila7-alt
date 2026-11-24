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
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`;

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-lg font-bold text-indigo-700">TriageSync</span>
            <div className="flex min-w-0 items-center gap-3 text-sm">
              <span className="truncate text-slate-600">{user.name} · {user.role}</span>
              <button onClick={logout} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-50">
                Log out
              </button>
            </div>
          </div>
          <nav className="mt-3 flex flex-wrap gap-1" aria-label="Main">
            {LINKS.filter((l) => !l.admin || user.role === 'ADMIN').map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>{l.label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}