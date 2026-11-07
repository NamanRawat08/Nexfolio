import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useWatchlist } from '../../context/WatchlistContext.jsx';

/**
 * Star toggle that adds or removes an instrument from the watchlist.
 *
 * @param {object} props
 * @param {string} props.symbol
 * @param {(message: string) => void} [props.onError]
 */
export function WatchButton({ symbol, onError }) {
  const { symbols, add, remove } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const watching = symbols.has(symbol);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await (watching ? remove(symbol) : add(symbol));
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const label = watching ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={watching}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Star
        className={`h-4 w-4 ${watching ? 'fill-accent text-accent' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
