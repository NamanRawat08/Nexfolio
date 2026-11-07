import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { useNotifications } from '../../context/NotificationsContext.jsx';
import { formatDateTime } from '../../utils/format.js';
import { badgeText } from './badgeText.js';

/**
 * Bell button with an unread badge and a dropdown list of notifications, such as a limit order
 * that has been filled. Closes on Escape and when you click elsewhere.
 *
 * @param {{ variant?: 'desktop' | 'mobile' }} props
 */
export function NotificationBell({ variant = 'desktop' }) {
  const rootRef = useRef(null);
  const { status, items, unreadCount, refresh, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setError('');
      refresh();
    }
    setOpen((value) => !value);
  };

  const onMarkAll = async () => {
    setError('');
    try {
      await markAllRead();
    } catch (err) {
      setError(err.message);
    }
  };

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';
  const Icon = unreadCount > 0 ? BellRing : Bell;

  const trigger =
    variant === 'mobile' ? (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted hover:text-fg"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && <Badge count={unreadCount} />}
      </button>
    ) : (
      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        title="Notifications"
        className="relative text-muted"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && <Badge count={unreadCount} />}
      </Button>
    );

  return (
    <div ref={rootRef} className="relative">
      {trigger}

      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className="fixed inset-x-4 top-[3.75rem] z-50 rounded-xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-fg">Notifications</h2>
            <Button variant="ghost" size="sm" onClick={onMarkAll} disabled={unreadCount === 0}>
              Mark all as read
            </Button>
          </div>

          {error && (
            <p role="alert" className="m-3 rounded-lg bg-loss/10 px-3 py-2 text-xs text-loss">
              {error}
            </p>
          )}

          {status === 'error' && items.length === 0 ? (
            <p role="alert" className="px-4 py-6 text-center text-sm text-loss">Could not load notifications.</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              You are all caught up. We will tell you here when a limit order fills.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-line/40 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <a
                    href="#orders"
                    onClick={() => setOpen(false)}
                    className="flex gap-3 px-4 py-3 hover:bg-surface-2/60"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-accent'}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-fg">
                        {n.title}
                        {!n.readAt && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-muted/80">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Badge({ count }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-fg"
    >
      {badgeText(count)}
    </span>
  );
}
