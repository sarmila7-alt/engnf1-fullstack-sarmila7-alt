import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { btnPrimary, inputCls } from '../components/ui.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-indigo-700">TriageSync</h1>
      <p className="mt-1 text-slate-600">Sign in to the support triage workspace.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className="block text-sm font-medium">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-1`} />
        </label>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-center text-sm text-slate-600">
          No account? <Link to="/register" className="font-medium text-indigo-700 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}