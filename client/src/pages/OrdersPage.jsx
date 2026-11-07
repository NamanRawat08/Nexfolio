import React, { useCallback, useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { PageHeader } from './PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { tradingApi } from '../api/trading.js';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { formatCurrency, formatDate, formatDateTime, formatSignedCurrency } from '../utils/format.js';

const PAGE_SIZE = 20;
const FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'PENDING' },
  { label: 'Filled', value: 'FILLED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];
const EMPTY_TEXT = {
  ALL: 'No orders yet. Buy or sell shares and they will be listed here.',
  PENDING: 'No open orders.',
  FILLED: 'No filled orders yet.',
  CANCELLED: 'No cancelled orders.',
};

function OrderItem({ order, onCancel, cancelling }) {
  const isBuy = order.side === 'BUY';
  const isLimit = order.orderType === 'LIMIT';
  const shares = `${order.quantity} ${order.quantity === '1' ? 'share' : 'shares'}`;
  const pnlNegative = order.realizedPnl?.startsWith('-');

  let detail;
  if (order.status === 'FILLED') {
    detail = `${shares} at ${formatCurrency(order.price)} = ${formatCurrency(order.total)}`;
    if (isLimit) detail += ` (limit ${formatCurrency(order.limitPrice)})`;
  } else {
    detail = `${shares}, ${isBuy ? 'at or below' : 'at or above'} ${formatCurrency(order.limitPrice)}`;
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-fg">{order.symbol}</span>
          <Badge variant={isBuy ? 'gain' : 'loss'}>{order.side}</Badge>
          <Badge variant="outline">{isLimit ? 'Limit' : 'Market'}</Badge>
          {order.status === 'PENDING' && <Badge variant="outline">Open</Badge>}
          {order.status === 'CANCELLED' && <Badge variant="outline">Cancelled</Badge>}
        </div>
        <div className="mt-0.5 text-xs text-muted">{order.name}</div>
        <div className="mt-0.5 text-xs tabular-nums text-fg">{detail}</div>
        <div className="mt-0.5 text-[11px] text-muted">
          Placed {formatDateTime(order.createdAt)}
          {order.status === 'FILLED' && isLimit && order.executedOn && ` · filled on ${formatDate(order.executedOn)}`}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {order.realizedPnl !== null && (
          <div className="text-right">
            <div className="text-[11px] text-muted">Profit/loss</div>
            <div className={`text-sm font-semibold tabular-nums ${pnlNegative ? 'text-loss' : 'text-gain'}`}>
              {formatSignedCurrency(order.realizedPnl)}
            </div>
          </div>
        )}
        {order.status === 'PENDING' && (
          <Button
            variant="outline"
            size="sm"
            disabled={cancelling}
            onClick={() => onCancel(order.id)}
            aria-label={`Cancel ${order.side} order for ${order.symbol}`}
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </Button>
        )}
      </div>
    </li>
  );
}

/** Complete order history with a status filter, paging and cancel for open orders. */
export function OrdersPage() {
  const { orders: recentOrders, refresh } = usePortfolio();
  const [filter, setFilter] = useState('ALL');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState('');

  const statusParam = filter === 'ALL' ? undefined : filter;

  // First page; reloads when the filter changes or an order is placed or changed elsewhere.
  useEffect(() => {
    const controller = new AbortController();
    setStatus((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    tradingApi
      .orders(PAGE_SIZE, controller.signal, statusParam, 0)
      .then((data) => {
        setItems(data.orders);
        setHasMore(data.orders.length === PAGE_SIZE);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setStatus('error');
      });
    return () => controller.abort();
  }, [statusParam, recentOrders]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    setError('');
    try {
      const data = await tradingApi.orders(PAGE_SIZE, undefined, statusParam, items.length);
      setItems((prev) => [...prev, ...data.orders]);
      setHasMore(data.orders.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [statusParam, items.length]);

  const cancel = async (id) => {
    if (cancellingId) return;
    setCancellingId(id);
    setError('');
    try {
      await tradingApi.cancelOrder(id);
    } catch (err) {
      setError(err.message);
    }
    // Reloading the shared portfolio data also reloads this list (recentOrders changes).
    await refresh().catch(() => {});
    setCancellingId(null);
  };

  return (
    <>
      <PageHeader title="Orders" description="Every simulated order you have placed, newest first." />

      <Card>
        <div className="mb-3">
          <SegmentedControl
            options={FILTERS}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setStatus('loading');
            }}
            ariaLabel="Filter orders by status"
          />
        </div>

        {error && (
          <p role="alert" className="mb-2 rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
            {error}
          </p>
        )}

        {status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : status === 'error' ? (
          <p role="alert" className="py-8 text-center text-sm text-loss">Could not load your orders.</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted">
            <Inbox className="mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
            <p className="text-sm">{EMPTY_TEXT[filter]}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line/40">
              {items.map((order) => (
                <OrderItem key={order.id} order={order} onCancel={cancel} cancelling={cancellingId === order.id} />
              ))}
            </ul>
            {hasMore && (
              <div className="pt-3 text-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Show more'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
