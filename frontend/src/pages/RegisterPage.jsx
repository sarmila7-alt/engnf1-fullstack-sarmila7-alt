import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { btnPrimary, inputCls } from '../components/ui.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    // Mirror the server rules so most mistakes are caught before a request is sent
    if (form.name.trim().length < 2) return setError('Name must be at least 2 characters.');
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return setError('Password must be 8 to 64 characters with at least one letter and one digit.');
    }
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-indigo-700">Create an account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <label className="block text-sm font-medium">
          Name
          <input required maxLength={50} autoComplete="name" value={form.name} onChange={set('name')} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={set('email')} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input type="password" required maxLength={64} autoComplete="new-password" value={form.password} onChange={set('password')} className={`${inputCls} mt-1`} />
        </label>
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy ? 'Creating account…' : 'Register'}</button>
        <p className="text-center text-sm text-slate-600">
          Already registered? <Link to="/login" className="font-medium text-indigo-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}