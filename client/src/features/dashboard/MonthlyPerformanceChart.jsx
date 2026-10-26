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
import { monthlyPerformanceData } from '../../data/mockDashboardData.js';
import { formatCurrency } from '../../utils/format.js';

function PerformanceTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const invested = payload.find((p) => p.dataKey === 'invested')?.value || 0;
    const returns = payload.find((p) => p.dataKey === 'returns')?.value || 0;
    const isGain = returns >= 0;

    return (
      <div className="bg-surface-2 border border-line p-3 rounded-lg shadow-lg text-xs min-w-[140px]">
        <p className="font-semibold text-fg mb-1.5">{label} 2026</p>
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
              {isGain ? '+' : ''}
              {formatCurrency(returns, { compact: true })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

/**
 * Monthly Performance Bar Chart.
 *
 * @param {object} props
 * @param {boolean} [props.compact] - 6 months on mobile vs 12 months on desktop
 */
export function MonthlyPerformanceChart({ compact = false }) {
  const data = compact
    ? monthlyPerformanceData.slice(-6)
    : monthlyPerformanceData;

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
              stroke="#33261e"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="#a89a8d"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#a89a8d"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v, { compact: true })}
            />
            <Tooltip content={<PerformanceTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
            />
            <Bar
              name="Invested"
              dataKey="invested"
              fill="#d9993a"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              name="Returns"
              dataKey="returns"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.returns >= 0 ? '#34d399' : '#ef6a5b'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
