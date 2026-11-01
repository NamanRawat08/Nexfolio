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
  formatSignedCurrency,
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
 * Compute mobile x-axis ticks to ensure even spacing and avoid skipped or repeated months.
 *
 * @param {string} range - '1M' | '3M' | '6M' | '1Y'
 * @param {Array<{date: string}>} points
 * @returns {string[]|undefined} array of date strings to use as ticks
 */
export function getMobileChartTicks(range, points) {
  if (!points || points.length === 0) return undefined;

  switch (range) {
    case '1M':
      // 5 evenly spaced ticks with 7-day cadence (never repeating months ambiguously)
      return [
        points[2]?.date,
        points[9]?.date,
        points[16]?.date,
        points[23]?.date,
        points[points.length - 1]?.date,
      ].filter(Boolean);

    case '3M':
      // 5 evenly spaced ticks (~21 days apart)
      return [
        points[4]?.date,
        points[25]?.date,
        points[46]?.date,
        points[67]?.date,
        points[points.length - 1]?.date,
      ].filter(Boolean);

    case '6M':
      // First-of-month ticks for all 6 months (May through Oct, no month skipped)
      return points
        .map((p) => p.date)
        .filter((d) => d.endsWith('-01'));

    case '1Y':
      // First-of-month ticks thinned evenly every 3 months
      return [
        '2025-11-01',
        '2026-02-01',
        '2026-05-01',
        '2026-08-01',
        '2026-10-01',
      ].filter((d) => points.some((p) => p.date === d));

    default:
      return undefined;
  }
}

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
  )} on ${formatDate(currentData.startDate)}, currently ${formatCurrency(
    currentData.currentValue
  )} on ${formatDate(currentData.endDate)}, change of ${formatSignedCurrency(
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
                {formatSignedCurrency(currentData.changeAmount)} (
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
              ticks={compact ? getMobileChartTicks(selectedRange, currentData.points) : undefined}
              tickFormatter={(d) => {
                if (!compact) return formatChartDate(d, { includeDay: true });
                if (selectedRange === '1M' || selectedRange === '3M') {
                  return formatChartDate(d, { includeDay: true });
                }
                return formatChartDate(d, { includeDay: false });
              }}
              minTickGap={compact ? 20 : 50}
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
