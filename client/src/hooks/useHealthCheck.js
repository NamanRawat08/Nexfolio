import { useState, useEffect } from 'react';

/**
 * Hook that polls GET /api/health and exposes status.
 * Extracted from the original App.jsx health check.
 *
 * @returns {{ status: 'checking' | 'online' | 'unreachable', data: object|null }}
 */
export function useHealthCheck() {
  const [state, setState] = useState({ status: 'checking', data: null });

  useEffect(() => {
    let isMounted = true;

    async function check() {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted) setState({ status: 'online', data });
      } catch {
        if (isMounted) setState({ status: 'unreachable', data: null });
      }
    }

    check();
    return () => { isMounted = false; };
  }, []);

  return state;
}
