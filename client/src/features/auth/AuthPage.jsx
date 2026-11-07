import React, { useId, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { friendlyAuthError, validateRegistration } from './authMessages.js';

function Field({ label, type = 'text', value, onChange, autoComplete, hint }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-fg mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full bg-surface-2 text-fg text-sm px-3 py-2.5 rounded-lg border border-line focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

/** Sign-in / create-account screen shown to anonymous visitors. */
export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login');
    setError('');
    setPassword('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!isLogin) {
      const problem = validateRegistration({ username: username.trim(), password });
      if (problem) {
        setError(problem);
        return;
      }
    }
    setSubmitting(true);
    setError('');
    try {
      if (isLogin) {
        await login(identifier.trim(), password);
      } else {
        await register(email.trim(), username.trim(), password);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg text-fg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent text-accent-fg font-black text-xl flex items-center justify-center shadow-sm">
            N
          </div>
          <span className="font-extrabold text-xl tracking-tight">Nexfolio</span>
        </div>

        <Card padding="lg">
          <h1 className="text-lg font-bold mb-1">{isLogin ? 'Sign in' : 'Create your account'}</h1>
          <p className="text-xs text-muted mb-5 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
            Paper trading with simulated data. No real money.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {isLogin ? (
              <Field
                label="Email or username"
                value={identifier}
                onChange={setIdentifier}
                autoComplete="username"
              />
            ) : (
              <>
                <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                <Field
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  autoComplete="username"
                  hint="3 to 30 characters. Letters, numbers and underscores only."
                />
              </>
            )}
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              hint={isLogin ? undefined : 'At least 8 characters. Longer is safer.'}
            />

            {error && (
              <p role="alert" className="text-xs text-loss bg-loss/10 border border-loss/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full">
              {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-xs text-muted mt-5 text-center">
            {isLogin ? 'New to Nexfolio?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-accent font-semibold hover:underline cursor-pointer"
            >
              {isLogin ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </Card>
      </div>
    </div>
  );
}
