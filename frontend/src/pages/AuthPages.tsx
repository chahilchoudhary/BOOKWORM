import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';

function useNext(): string {
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'; // only same-site paths
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const next = useNext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerError('');
    try {
      await login(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-6 text-2xl">Log in</h1>
      <form onSubmit={submit} noValidate className="panel space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-err' : undefined} />
          {errors.email && <p id="email-err" className="mt-1 text-xs text-danger">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className={`input ${errors.password ? 'input-error' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'pw-err' : undefined} />
          {errors.password && <p id="pw-err" className="mt-1 text-xs text-danger">{errors.password}</p>}
        </div>
        {serverError && <p role="alert" className="text-sm text-danger">{serverError}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-sm text-muted">
          New here? <Link to={`/register?next=${encodeURIComponent(next)}`} className="link">Create an account</Link>
        </p>
        <p className="text-xs text-muted">Demo: demo@bookworm.test / Password123!</p>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const next = useNext();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerError('');
    try {
      await register(form.name, form.email, form.password);
      navigate(next, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not register');
    } finally {
      setBusy(false);
    }
  }

  const field = (key: 'name' | 'email' | 'password', label: string, type = 'text') => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} type={type} className={`input ${errors[key] ? 'input-error' : ''}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-err` : undefined} />
      {errors[key] && <p id={`${key}-err`} className="mt-1 text-xs text-danger">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="mb-6 text-2xl">Create account</h1>
      <form onSubmit={submit} noValidate className="panel space-y-4">
        {field('name', 'Name')}
        {field('email', 'Email', 'email')}
        {field('password', 'Password (min 8 characters)', 'password')}
        {serverError && <p role="alert" className="text-sm text-danger">{serverError}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-sm text-muted">
          Already have an account? <Link to={`/login?next=${encodeURIComponent(next)}`} className="link">Log in</Link>
        </p>
      </form>
    </div>
  );
}
