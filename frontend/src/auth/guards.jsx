import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Spinner } from '../components/ui.jsx';

// Logged-in pages. Pass role="ADMIN" to restrict a group of routes.
export function RequireAuth({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Login and register: a signed-in user is sent to the app instead
export function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking your session…" />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}