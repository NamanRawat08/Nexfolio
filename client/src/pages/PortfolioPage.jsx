import React from 'react';
import { PageHeader } from './PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { PortfolioChart } from '../features/dashboard/PortfolioChart.jsx';
import { HoldingsCard } from '../features/dashboard/HoldingsCard.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { buildAllocation } from '../utils/allocation.js';
import { formatCurrency, formatSignedCurrency } from '../utils/format.js';

function StatCard({ label, value, note, tone }) {
  const color = tone === 'signed' ? (value?.startsWith('-') ? 'text-loss' : 'text-gain') : 'text-fg';
  return (
    <Card padding="sm" className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 truncate text-lg font-bold tabular-nums ${color}`}>
        {value === null || value === undefined
          ? '—'
          : tone === 'signed'
            ? formatSignedCurrency(value)
            : formatCurrency(value)}
      </div>
      {note && <div className="mt-0.5 text-[11px] text-muted">{note}</div>}
    </Card>
  );
}

/** Where the money is: sectors and cash, as shares of the whole portfolio. */
function AllocationCard() {
  const { status, summary, holdings } = usePortfolio();
  const allocation = status === 'ready' && summary ? buildAllocation({ cash: summary.cash, holdings }) : null;

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Allocation</h2>
        <span className="mt-0.5 block text-[11px] text-muted">Share of your total portfolio value</span>
      </div>

      {status === 'loading' ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : status === 'error' || !allocation ? (
        <p role="alert" className="py-6 text-center text-sm text-loss">Could not load allocation.</p>
      ) : allocation.slices.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nothing to show yet.</p>
      ) : (
        <ul className="space-y-3">
          {allocation.slices.map((slice) => {
            const percent = `${(slice.share * 100).toFixed(1)}%`;
            return (
              <li key={slice.label}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold text-fg">{slice.label}</span>
                  <span className="tabular-nums text-muted">
                    {formatCurrency(slice.value)} · {percent}
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${slice.label}: ${percent} of your portfolio`}
                  className="h-2 overflow-hidden rounded-full bg-surface-2"
                >
                  <div
                    className={`h-full rounded-full ${slice.kind === 'cash' ? 'bg-muted' : 'bg-accent'}`}
                    style={{ width: percent }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * Portfolio overview: key numbers, the value chart, positions and allocation.
 *
 * @param {{ compact?: boolean }} props
 */
export function PortfolioPage({ compact = false }) {
  const { status, summary } = usePortfolio();
  const s = status === 'ready' ? summary : null;

  return (
    <>
      <PageHeader title="Portfolio" description="Everything you own and how it is doing. All figures are simulated." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total value" value={s?.totalValue} />
        <StatCard label="Invested" value={s?.investedValue} />
        <StatCard
          label="Available cash"
          value={s?.availableCash}
          note={s && s.reservedCash !== '0.00' ? `${formatCurrency(s.reservedCash)} set aside` : null}
        />
        <StatCard label="Unrealized P&L" value={s?.unrealizedPnl} tone="signed" />
        <StatCard label="Day P&L" value={s?.dayPnl} tone="signed" />
      </div>

      <PortfolioChart compact={compact} />

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col lg:col-span-7">
          <HoldingsCard />
        </div>
        <div className="flex flex-col lg:col-span-5">
          <AllocationCard />
        </div>
      </div>
    </>
  );
}
