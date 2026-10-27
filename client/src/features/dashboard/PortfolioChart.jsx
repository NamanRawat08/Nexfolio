import React, { useState, useId } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '../../components/ui/Card.jsx';
import { SegmentedControl } from '../../components/ui/SegmentedControl.jsx';
import { portfolioRanges } from '../../data/mockDashboardData.js';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatChartDate,
  toChartNumbers,
} from '../../utils/format.js';
import { TrendingUp, TrendingDown } from 'lucide-react';

const RANGE_OPTIONS = [
  { label: '1Y', value: '1Y' },
  { label: '6M', value: '6M' },
  { label: '3M', value: '3M' },
  { label: '1M', value: '1M' },
];

/**
 * Custom accessible tooltip for Recharts.
 */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface-2 border border-line p-2.5 rounded-lg shadow-lg text-xs">
        <p className="text-muted mb-0.5">{formatDate(data.date)}</p>
        <p className="text-fg font-bold tabular-nums">
          {formatCurrency(data.value)}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Portfolio valuation chart with time-range selector.
 *
 * @param {object} props
 * @param {boolean} [props.compact] - Adjusts height and tick density for mobile
 */
export function PortfolioChart({ compact = false }) {
  const [selectedRange, setSelectedRange] = useState('6M');
  const gradientId = useId();

  const currentData = portfolioRanges[selectedRange] || portfolioRanges['6M'];
  const chartPoints = toChartNumbers(currentData.points);

  const isPositive = currentData.changePercent >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
  const changeColorClass = isPositive ? 'text-gain' : 'text-loss';

  const ariaDescription = `Simulated portfolio value over ${selectedRange}: started at ${formatCurrency(
    currentData.startValue,
    { compact: true }
  )} on ${currentData.startDate}, currently ${formatCurrency(
    currentData.currentValue
  )} on ${currentData.endDate}, change of ${isPositive ? '+' : ''}${formatCurrency(
    currentData.changeAmount
  )} (${formatPercent(currentData.changePercent)}).`;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-muted block mb-1">
            Simulated Portfolio Value
          </span>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight tabular-nums">
              {formatCurrency(currentData.currentValue)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${changeColorClass}`}
            >
              <ChangeIcon className="w-4 h-4" aria-hidden="true" />
              <span>
                {isPositive ? '+' : ''}
                {formatCurrency(currentData.changeAmount)} (
                {formatPercent(currentData.changePercent)})
              </span>
            </span>
          </div>
        </div>

        <SegmentedControl
          options={RANGE_OPTIONS}
          value={selectedRange}
          onChange={setSelectedRange}
          ariaLabel="Select portfolio history time range"
        />
      </div>

      <div
        role="img"
        aria-label={ariaDescription}
        className="w-full relative select-none"
        style={{ height: compact ? 220 : 300 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartPoints}
            margin={{ top: 10, right: compact ? 12 : 10, left: compact ? -12 : 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--color-line)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="var(--color-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d) => formatChartDate(d, { includeDay: !compact })}
              minTickGap={compact ? 40 : 50}
            />
            <YAxis
              stroke="var(--color-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 15000', 'dataMax + 15000']}
              tickFormatter={(v) => formatCurrency(v, { compact: true })}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2.2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              activeDot={{
                r: 5,
                fill: 'var(--color-accent)',
                stroke: 'var(--color-surface)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
