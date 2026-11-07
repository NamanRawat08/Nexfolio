import React, { useState } from 'react';
import { Hourglass } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { tradingApi } from '../../api/trading.js';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatCurrency, formatDateTime } from '../../utils/format.js';

/** Limit orders waiting for their price, with a Cancel button for each. */
export function OpenOrdersCard() {
  const { status, openOrders, refresh } = usePortfolio();
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');

  const cancel = async (id) => {
    if (cancellingId) return;
    setCancellingId(id);
    setError('');
    try {
      await tradingApi.cancelOrder(id);
    } catch (err) {
      setError(err.message);
    }
    // Reload either way so the list matches the server (the order may already have filled).
    await refresh().catch(() => {});
    setCancellingId(null);
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Open Orders</h2>
          <span className="mt-0.5 block text-[11px] text-muted">
            Limit orders waiting for their price
          </span>
        </div>
        <Badge variant="outline">{openOrders.length} open</Badge>
      </div>

      {error && (
        <p role="alert" className="mb-2 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
          {error}
        </p>
      )}

      {status === 'loading' ? (
        <Skeleton className="h-10 w-full" />
      ) : status === 'error' ? (
        <p role="alert" className="py-6 text-center text-sm text-loss">Could not load open orders.</p>
      ) : openOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
          <Hourglass className="mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-fg">No open orders</p>
          <p className="mt-1 text-xs">
            Choose “Limit” when you buy or sell to wait for the price you want.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line/40">
          {openOrders.map((order) => {
            const isBuy = order.side === 'BUY';
            return (
              <li key={order.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-fg">{order.symbol}</span>
                    <Badge variant={isBuy ? 'buy' : 'sell'}>{order.side}</Badge>
                  </div>
                  <div className="text-xs text-muted">
                    {order.quantity} {order.quantity === '1' ? 'share' : 'shares'} at{' '}
                    {isBuy ? 'or below' : 'or above'} {formatCurrency(order.limitPrice)}
                  </div>
                  <div className="text-[11px] text-muted/80">Placed {formatDateTime(order.createdAt)}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancellingId !== null}
                  onClick={() => cancel(order.id)}
                  aria-label={`Cancel ${order.side} order for ${order.symbol}`}
                >
                  {cancellingId === order.id ? 'Cancelling…' : 'Cancel'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
