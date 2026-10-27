import { useState, useEffect } from 'react';

/**
 * Hook that executes a single GET /api/health request on mount to check API status.
 * Note: Performs a single fetch on mount, no recurring polling.
 *
 * @returns {{ status: 'checking' | 'online' | 'unreachable', data: object|null }}
 */
export function useHealthCheck() {
  const [state, setState] = useState({ status: 'checking', data: null });

  useEffect(() => {
    const controller = new AbortController();

    async function check() {
      try {
        const res = await fetch('/api/health', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setState({ status: 'online', data });
      } catch (err) {
        if (err.name === 'AbortError') return;
        setState({ status: 'unreachable', data: null });
      }
    }

    check();
    return () => {
      controller.abort();
    };
  }, []);

  return state;
}
