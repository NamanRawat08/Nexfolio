import React from 'react';
import { Briefcase } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatCurrency, formatSignedCurrency } from '../../utils/format.js';

/** Current positions with value and unrealized P&L, from GET /api/holdings. */
export function HoldingsCard() {
  const { status, holdings } = usePortfolio();

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Holdings</h2>
          <span className="mt-0.5 block text-[11px] text-muted">Your simulated positions</span>
        </div>
        <Badge variant="outline">{holdings.length} {holdings.length === 1 ? 'position' : 'positions'}</Badge>
      </div>

      {status === 'loading' ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : status === 'error' ? (
        <p role="alert" className="py-6 text-center text-sm text-loss">Could not load holdings.</p>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
          <Briefcase className="mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">No positions yet</p>
          <p className="mt-1 text-xs">Buy shares to see them here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="pb-2 font-semibold">Symbol</th>
                <th scope="col" className="pb-2 text-right font-semibold">Qty</th>
                <th scope="col" className="pb-2 text-right font-semibold">Avg cost</th>
                <th scope="col" className="pb-2 text-right font-semibold">Value</th>
                <th scope="col" className="pb-2 text-right font-semibold">P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {holdings.map((h) => {
                const pnlNegative = h.unrealizedPnl !== null && h.unrealizedPnl.startsWith('-');
                return (
                  <tr key={h.symbol}>
                    <th scope="row" className="py-2 pr-2 text-sm font-bold text-fg">{h.symbol}</th>
                    <td className="py-2 text-right tabular-nums">{h.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(h.avgCost)}</td>
                    <td className="py-2 text-right tabular-nums">{h.value ? formatCurrency(h.value) : '—'}</td>
                    <td
                      className={`py-2 text-right font-semibold tabular-nums ${
                        h.unrealizedPnl === null ? 'text-muted' : pnlNegative ? 'text-loss' : 'text-gain'
                      }`}
                    >
                      {h.unrealizedPnl === null ? '—' : formatSignedCurrency(h.unrealizedPnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
