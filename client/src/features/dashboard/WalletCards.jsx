import React, { useState } from 'react';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { walletData } from '../../data/mockDashboardData.js';
import { formatCurrency, formatSignedCurrency, formatPercent } from '../../utils/format.js';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

/**
 * Wallet cards displaying simulated liquidity, invested balance, and quick actions.
 *
 * @param {object} props
 * @param {boolean} [props.compact] - Mobile snap carousel vs desktop stacked arrangement
 */
export function WalletCards({ compact = false }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const cards = [
    {
      id: 'available-cash',
      title: 'Available Cash',
      subtitle: 'Simulated Liquidity',
      amount: walletData.availableCash,
      badge: 'SIM',
      gradient: 'from-surface-2 via-surface to-bg',
      border: 'border-accent/30',
      icon: Wallet,
      detail: 'Instant virtual buying power',
    },
    {
      id: 'invested-value',
      title: 'Invested Value',
      subtitle: 'Active Positions',
      amount: walletData.investedValue,
      badge: 'SIM',
      gradient: 'from-surface-2 to-surface',
      border: 'border-line',
      icon: TrendingUp,
      detail: 'Current market holding valuation',
    },
    {
      id: 'day-pnl',
      title: 'Day P&L',
      subtitle: "Today's Unrealized",
      amount: walletData.dayPnL,
      percent: walletData.dayPnLPercent,
      isGain: walletData.isDayPnLPositive,
      badge: 'SIM',
      gradient: 'from-surface to-bg',
      border: 'border-gain/20',
      icon: ArrowUpRight,
      detail: 'Net day movement',
    },
  ];

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const cardEl = el.firstElementChild;
    if (!cardEl) return;
    const itemWidth = cardEl.offsetWidth + 12; // gap-3 = 12px
    const idx = Math.round(el.scrollLeft / itemWidth);
    setActiveIndex(Math.min(Math.max(0, idx), cards.length - 1));
  };

  return (
    <Card className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase font-semibold tracking-wider text-muted">
            Simulated Balances
          </h2>
          <Badge variant="accent">Virtual Funds</Badge>
        </div>

        {compact ? (
          // Mobile: Horizontal scroll-snap carousel with card edge bleed and peek
          <div>
            <div
              tabIndex={0}
              aria-label="Simulated balances carousel"
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 sm:-mx-5 sm:px-5 scroll-px-4 sm:scroll-px-5 no-scrollbar focus:outline-none"
            >
              {cards.map((c) => {
                const Icon = c.icon;
                const isSigned = c.isGain !== undefined;
                const colorClass = isSigned
                  ? c.isGain
                    ? 'text-gain'
                    : 'text-loss'
                  : 'text-fg';

                return (
                  <div
                    key={c.id}
                    className={`min-w-[80%] max-w-[85%] shrink-0 snap-start p-4 rounded-xl border bg-linear-to-br ${c.gradient} ${c.border} flex flex-col justify-between shadow-sm`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-xs text-muted block">{c.subtitle}</span>
                        <span className="text-sm font-semibold text-fg">{c.title}</span>
                      </div>
                      <Badge variant="outline" className="border-accent/40 text-accent">
                        {c.badge}
                      </Badge>
                    </div>
                    <div>
                      <div className={`text-xl font-bold tabular-nums mb-1 ${colorClass}`}>
                        {isSigned
                          ? formatSignedCurrency(c.amount)
                          : formatCurrency(c.amount)}
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                        {c.percent !== undefined ? (
                          <>
                            <span
                              className={`font-semibold tabular-nums ${
                                c.isGain ? 'text-gain' : 'text-loss'
                              }`}
                            >
                              {formatPercent(c.percent)}
                            </span>
                            <span>today</span>
                          </>
                        ) : (
                          <span>{c.detail}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Decorative dot indicators following active snap position */}
            <div
              aria-hidden="true"
              className="flex items-center justify-center gap-1.5 pt-2"
            >
              {cards.map((c, idx) => (
                <span
                  key={c.id}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    activeIndex === idx ? 'w-4 bg-accent' : 'w-1.5 bg-line'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          // Desktop: Layered stacked cards with slight visual offsets
          <div className="space-y-3">
            {cards.map((c, index) => {
              const Icon = c.icon;
              const isSigned = c.isGain !== undefined;
              const colorClass = isSigned
                ? c.isGain
                  ? 'text-gain'
                  : 'text-loss'
                : 'text-fg';

              return (
                <div
                  key={c.id}
                  style={{ transform: `translateY(${index * 1}px)` }}
                  className={`p-3.5 rounded-xl border bg-linear-to-br ${c.gradient} ${c.border} transition-all hover:border-accent/40 shadow-sm`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                        <span className="text-xs text-muted font-medium">{c.title}</span>
                      </div>
                      <div className={`text-lg font-bold tabular-nums mt-0.5 ${colorClass}`}>
                        {isSigned
                          ? formatSignedCurrency(c.amount)
                          : formatCurrency(c.amount)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="border-accent/40 text-accent">
                        {c.badge}
                      </Badge>
                      {c.percent !== undefined && (
                        <span
                          className={`text-[11px] font-semibold tabular-nums ${
                            c.isGain ? 'text-gain' : 'text-loss'
                          }`}
                        >
                          {formatPercent(c.percent)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions (Visual Placeholders) */}
      <div className="pt-4 mt-3 border-t border-line/60">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-2">
          Quick Actions (Simulated)
        </span>
        <div className="grid grid-cols-2 gap-2">
          {/* TODO(feature): wire up trading order execution for Buy */}
          <Button
            variant="primary"
            size="md"
            disabled
            title="Buy orders not available yet (Simulation only)"
            aria-disabled="true"
            className="w-full flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            <span>Buy</span>
          </Button>

          {/* TODO(feature): wire up trading order execution for Sell */}
          <Button
            variant="outline"
            size="md"
            disabled
            title="Sell orders not available yet (Simulation only)"
            aria-disabled="true"
            className="w-full flex items-center gap-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
            <span>Sell</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
