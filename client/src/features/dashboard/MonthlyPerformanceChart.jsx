import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Card } from '../../components/ui/Card.jsx';
import { monthlyPerformanceData, SAMPLE_AS_OF } from '../../data/mockDashboardData.js';
import {
  formatCurrency,
  formatSignedCurrency,
  formatMonthTick,
  formatMonthYear,
  toChartNumbers,
} from '../../utils/format.js';

function PerformanceTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const invested = payload.find((p) => p.dataKey === 'invested')?.value || 0;
    const returns = payload.find((p) => p.dataKey === 'returns')?.value || 0;
    const isGain = returns >= 0;

    return (
      <div className="bg-surface-2 border border-line p-3 rounded-lg shadow-lg text-xs min-w-[140px]">
        <p className="font-semibold text-fg mb-1.5">
          {formatMonthYear(label, { asOfDate: SAMPLE_AS_OF })}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-muted">
            <span>Invested:</span>
            <span className="font-semibold text-fg tabular-nums">
              {formatCurrency(invested, { compact: true })}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted">
            <span>Returns:</span>
            <span
              className={`font-semibold tabular-nums ${
                isGain ? 'text-gain' : 'text-loss'
              }`}
            >
              {formatSignedCurrency(returns, { compact: true })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

/**
 * Custom accessible legend with token swatches for Invested (accent), Returns (gain), and Loss.
 */
function CustomBarLegend() {
  return (
    <div className="flex items-center justify-end gap-3.5 text-[11px] text-muted pb-2 select-none">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: 'var(--color-accent)' }}
          data-legend-swatch="invested"
        />
        <span>Invested</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: 'var(--color-gain)' }}
          data-legend-swatch="returns"
        />
        <span>Returns</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: 'var(--color-loss)' }}
          data-legend-swatch="loss"
        />
        <span>Loss</span>
      </div>
    </div>
  );
}

/**
 * Monthly Performance Bar Chart.
 *
 * @param {object} props
 * @param {boolean} [props.compact] - 6 months on mobile vs 12 months on desktop
 */
export function MonthlyPerformanceChart({ compact = false }) {
  const rawData = compact
    ? monthlyPerformanceData.slice(-6)
    : monthlyPerformanceData;
  const data = toChartNumbers(rawData);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs uppercase font-semibold tracking-wider text-muted">
            Monthly Performance
          </h2>
          <p className="text-xs text-muted/80 mt-0.5">
            Simulated capital allocation vs net monthly returns
          </p>
        </div>
      </div>

      <div
        role="img"
        aria-label="Monthly performance grouped bar chart comparing invested capital and returns"
        className="w-full relative select-none"
        style={{ height: compact ? 220 : 280 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: compact ? -18 : 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="var(--color-line)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="var(--color-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatMonthTick}
            />
            <YAxis
              stroke="var(--color-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v, { compact: true })}
            />
            <Tooltip
              content={<PerformanceTooltip />}
              cursor={{ fill: 'var(--color-surface-2)', opacity: 0.5 }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              content={<CustomBarLegend />}
            />
            <Bar
              name="Invested"
              dataKey="invested"
              fill="var(--color-accent)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              name="Returns"
              dataKey="returns"
              fill="var(--color-gain)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.returns >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
