import { useEffect, useState } from 'react';

/**
 * Runs an async fetcher on mount and whenever deps change, aborting the previous
 * request. Previous data is kept while reloading so charts do not flash empty.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} fetcher
 * @param {Array<unknown>} deps
 * @returns {{ status: 'loading' | 'ready' | 'error', data: T | null }}
 */
export function useApiData(fetcher, deps) {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: 'loading' }));
    fetcher(controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState((prev) => ({ ...prev, status: 'error' }));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
