import React, { useId, useState } from 'react';
import { LogOut } from 'lucide-react';
import { PageHeader } from './PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { authApi } from '../api/auth.js';
import { friendlyAuthError, validatePasswordChange } from '../features/auth/authMessages.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { formatDate } from '../utils/format.js';

const THEME_OPTIONS = [
  { value: 'system', label: 'Match my device', hint: 'Switches with your phone or computer setting' },
  { value: 'light', label: 'Light', hint: 'Bright background' },
  { value: 'dark', label: 'Dark', hint: 'Dark background, easier on the eyes at night' },
];

function Section({ title, description, children }) {
  return (
    <Card>
      <h2 className="text-sm font-bold text-fg">{title}</h2>
      {description && <p className="mt-0.5 mb-3 text-xs text-muted">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </Card>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-fg">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-fg focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
    </div>
  );
}

/** Change-password form. Other devices are signed out; this one stays signed in. */
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setDone(false);
    const problem = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
      <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
      <p className="-mt-1 text-[11px] text-muted">At least 8 characters. Longer is safer.</p>
      <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />

      {error && (
        <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-lg border border-gain/30 bg-gain/10 px-3 py-2 text-xs text-gain">
          Your password was changed. You have been signed out on your other devices.
        </p>
      )}

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Saving…' : 'Change password'}
      </Button>
    </form>
  );
}

/** Appearance, account details, password and sign-out. */
export function SettingsPage() {
  const { user, logout } = useAuth();
  const { preference, setPreference } = useTheme();

  return (
    <>
      <PageHeader title="Settings" description="Your account and how Nexfolio looks." />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          <Section title="Appearance" description="Choose a light or dark look.">
            <fieldset>
              <legend className="sr-only">Theme</legend>
              <div className="space-y-2">
                {THEME_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 ${
                      preference === opt.value ? 'border-accent bg-accent/10' : 'border-line bg-surface-2'
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={opt.value}
                      checked={preference === opt.value}
                      onChange={() => setPreference(opt.value)}
                      className="mt-1 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-fg">{opt.label}</span>
                      <span className="block text-xs text-muted">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section title="Password" description="Choose a new password. Other devices will be signed out.">
            <ChangePasswordForm />
          </Section>

          <Section title="Session">
            <Button variant="outline" onClick={logout} className="gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </Section>
        </div>

        <div className="space-y-4 lg:space-y-6">
          <Section title="Account">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Username</dt>
                <dd className="font-semibold text-fg">{user.username}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Email</dt>
                <dd className="break-all font-semibold text-fg">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Member since</dt>
                <dd className="font-semibold text-fg">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="About">
            <p className="text-xs leading-relaxed text-muted">
              Nexfolio is a practice trading simulator. Prices are simulated, the money is not real, and
              nothing here is financial advice.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
