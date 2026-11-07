import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { tradingApi } from '../../api/trading.js';
import { Button } from '../../components/ui/Button.jsx';
import { formatCurrency } from '../../utils/format.js';
import { TradeDialog } from './TradeDialog.jsx';
import { WatchButton } from './WatchButton.jsx';

const DEBOUNCE_MS = 250;

/**
 * Search box for instruments (by symbol or company name). Each result can be starred
 * or bought straight away.
 *
 * @param {object} props
 * @param {boolean} [props.autoFocus]
 * @param {string} [props.className]
 */
export function InstrumentSearch({ autoFocus = false, className = '' }) {
  const rootRef = useRef(null);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle', results: [] });
  const [error, setError] = useState('');
  const [buySymbol, setBuySymbol] = useState(null);

  const trimmed = term.trim();

  // Debounced search; stale responses are aborted.
  useEffect(() => {
    if (trimmed === '') {
      setState({ status: 'idle', results: [] });
      return undefined;
    }
    setState((prev) => ({ ...prev, status: 'loading' }));
    const controller = new AbortController();
    const timer = setTimeout(() => {
      tradingApi
        .searchInstruments(trimmed, controller.signal)
        .then((data) => setState({ status: 'ready', results: data.instruments }))
        .catch((err) => {
          if (err.name !== 'AbortError') setState({ status: 'error', results: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Close the results when clicking elsewhere.
  useEffect(() => {
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const showPanel = open && trimmed !== '';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={term}
        autoFocus={autoFocus}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          setError('');
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="Search instruments"
        placeholder="Search instruments (e.g. RELIANCE, TCS)"
        autoComplete="off"
        className="w-full rounded-lg border border-line bg-surface-2/80 py-2 pl-9 pr-4 text-sm text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-96 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
          {error && (
            <p role="alert" className="m-1 rounded-lg bg-loss/10 px-3 py-2 text-xs text-loss">
              {error}
            </p>
          )}
          {state.status === 'loading' && state.results.length === 0 ? (
            <p role="status" className="px-3 py-3 text-xs text-muted">Searching…</p>
          ) : state.status === 'error' ? (
            <p role="alert" className="px-3 py-3 text-xs text-loss">Search is not available right now.</p>
          ) : state.results.length === 0 ? (
            <p role="status" className="px-3 py-3 text-xs text-muted">No instruments match “{trimmed}”.</p>
          ) : (
            <ul>
              {state.results.map((r) => (
                <li key={r.symbol} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2/60">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-fg">{r.symbol}</div>
                    <div className="max-w-[160px] truncate text-xs text-muted">{r.name}</div>
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-fg">
                    {r.latestClose ? formatCurrency(r.latestClose) : '—'}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="buy-outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false);
                        setBuySymbol(r.symbol);
                      }}
                    >
                      Buy
                    </Button>
                    <WatchButton symbol={r.symbol} onError={setError} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <TradeDialog
        open={buySymbol !== null}
        side="BUY"
        initialSymbol={buySymbol ?? undefined}
        onClose={() => setBuySymbol(null)}
      />
    </div>
  );
}
