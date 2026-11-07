import React, { useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { TradeDialog } from '../trading/TradeDialog.jsx';
import { formatCurrency, formatPercent, formatSignedCurrency } from '../../utils/format.js';

/**
 * The first thing on the dashboard: total portfolio value, today's change, and the Buy and
 * Sell actions.
 */
export function HeroSummary() {
  const { status, summary } = usePortfolio();
  const [tradeSide, setTradeSide] = useState(null);
  const ready = status === 'ready' && summary !== null;

  const dayUp = ready && !summary.dayPnl.startsWith('-');
  const DayIcon = dayUp ? TrendingUp : TrendingDown;

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Total portfolio value</h2>
        {status === 'error' ? (
          <p role="alert" className="mt-2 text-sm text-loss">Could not load your portfolio.</p>
        ) : !ready ? (
          <>
            <Skeleton className="mt-2 h-10 w-56" />
            <Skeleton className="mt-2 h-4 w-40" />
          </>
        ) : (
          <>
            <div className="mt-1 font-display lining-nums text-4xl font-semibold tracking-tight tabular-nums text-fg sm:text-5xl">
              {formatCurrency(summary.totalValue)}
            </div>
            <div
              className={`mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums ${
                dayUp ? 'text-gain' : 'text-loss'
              }`}
            >
              <DayIcon className="h-4 w-4" aria-hidden="true" />
              <span>
                {formatSignedCurrency(summary.dayPnl)} ({formatPercent(summary.dayPnlRatio)})
              </span>
              <span className="font-normal text-muted">vs previous close</span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:w-72">
        <Button variant="buy" size="lg" disabled={!ready} onClick={() => setTradeSide('BUY')}>
          Buy
        </Button>
        <Button variant="sell" size="lg" disabled={!ready} onClick={() => setTradeSide('SELL')}>
          Sell
        </Button>
      </div>

      <TradeDialog
        open={tradeSide !== null}
        side={tradeSide ?? 'BUY'}
        onClose={() => setTradeSide(null)}
      />
    </Card>
  );
}
