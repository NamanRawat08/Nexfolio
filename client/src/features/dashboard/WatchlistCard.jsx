import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { useWatchlist } from '../../context/WatchlistContext.jsx';
import { TradeDialog } from '../trading/TradeDialog.jsx';
import { WatchButton } from '../trading/WatchButton.jsx';
import { formatCurrency, formatSignedCurrency, formatPercent } from '../../utils/format.js';

/** Instruments the user is watching, with the latest price and day change. */
export function WatchlistCard() {
  const { status, items } = useWatchlist();
  const [buySymbol, setBuySymbol] = useState(null);
  const [error, setError] = useState('');

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Watchlist</h2>
          <span className="mt-0.5 block text-[11px] text-muted">Instruments you are keeping an eye on</span>
        </div>
        <Badge variant="outline">{items.length} saved</Badge>
      </div>

      {error && (
        <p role="alert" className="mb-2 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
          {error}
        </p>
      )}

      {status === 'loading' ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : status === 'error' ? (
        <p role="alert" className="py-6 text-center text-sm text-loss">Could not load your watchlist.</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
          <Eye className="mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">Your watchlist is empty</p>
          <p className="mt-1 text-xs">Search for an instrument and tap the star to save it here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line/40">
          {items.map((item) => {
            const down = item.change !== null && item.change.startsWith('-');
            return (
              <li key={item.symbol} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-fg">{item.symbol}</div>
                  <div className="max-w-[140px] truncate text-xs text-muted sm:max-w-[200px]">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-fg">
                    {item.latestClose ? formatCurrency(item.latestClose) : '—'}
                  </div>
                  {item.change !== null && (
                    <div className={`text-[11px] font-semibold tabular-nums ${down ? 'text-loss' : 'text-gain'}`}>
                      {formatSignedCurrency(item.change)} ({formatPercent(item.changePercent)})
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="buy-outline" size="sm" onClick={() => setBuySymbol(item.symbol)}>
                    Buy
                  </Button>
                  <WatchButton symbol={item.symbol} onError={setError} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TradeDialog
        open={buySymbol !== null}
        side="BUY"
        initialSymbol={buySymbol ?? undefined}
        onClose={() => setBuySymbol(null)}
      />
    </Card>
  );
}
