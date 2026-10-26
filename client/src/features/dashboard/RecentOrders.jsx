import React from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { recentOrdersData } from '../../data/mockDashboardData.js';
import { formatCurrency, formatDateTime } from '../../utils/format.js';
import { Clock, Inbox } from 'lucide-react';

/**
 * Loading skeleton state for order rows.
 */
function OrderSkeletonRow() {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-line/40 last:border-b-0">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="w-24 h-3.5" />
          <Skeleton className="w-16 h-2.5" />
        </div>
      </div>
      <div className="flex flex-col items-end space-y-1.5">
        <Skeleton className="w-16 h-3.5" />
        <Skeleton className="w-20 h-2.5" />
      </div>
    </div>
  );
}

/**
 * Recent simulated order executions list.
 *
 * @param {object} props
 * @param {Array<object>} [props.items] - Order records (defaults to mock orders)
 * @param {boolean} [props.isLoading] - Triggers loading skeleton display
 */
export function RecentOrders({ items = recentOrdersData, isLoading = false }) {
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs uppercase font-semibold tracking-wider text-muted">
            Recent Orders
          </h2>
          <span className="text-[11px] text-muted block mt-0.5">
            Simulated market executions
          </span>
        </div>
        <Badge variant="outline">Last 6 Fills</Badge>
      </div>

      <div className="flex-1 divide-y divide-line/40">
        {isLoading ? (
          <>
            <OrderSkeletonRow />
            <OrderSkeletonRow />
            <OrderSkeletonRow />
            <OrderSkeletonRow />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
            <Inbox className="w-8 h-8 mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm font-medium text-fg">No simulated orders yet</p>
            <p className="text-xs mt-1 text-muted">
              Executed orders will appear here in real-time.
            </p>
          </div>
        ) : (
          items.map((order) => {
            const isBuy = order.type === 'BUY';
            const initials = order.symbol.slice(0, 3);

            return (
              <div
                key={order.id}
                className="flex items-center justify-between py-2.5 transition-colors hover:bg-surface-2/40 px-1 rounded-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    initials={initials}
                    size="md"
                    ariaLabel={`${order.symbol} ticker logo`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-fg truncate">
                        {order.symbol}
                      </span>
                      <Badge variant={isBuy ? 'gain' : 'loss'}>
                        {order.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted truncate max-w-[140px] sm:max-w-[200px]">
                      {order.name}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-3">
                  <div className="text-sm font-semibold tabular-nums text-fg">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <div className="text-[11px] text-muted flex items-center justify-end gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-muted/70" aria-hidden="true" />
                    <span>{formatDateTime(order.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
