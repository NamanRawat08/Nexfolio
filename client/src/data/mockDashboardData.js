/**
 * SAMPLE DATA ONLY — Nexfolio Trading Simulation.
 * Not real market data, not connected to any external exchange or live API.
 *
 * NOTE ON MONEY REPRESENTATION:
 * Monetary amounts are represented as strings (e.g. "1284500.00") rather than
 * JavaScript floating-point numbers. This mirrors PostgreSQL NUMERIC / DECIMAL
 * responses over JSON and avoids binary IEEE-754 precision loss.
 * Components display them via format utilities; charts convert them in an
 * explicit display-only adapter (utils/format.js: toChartNumbers).
 */

// Simple deterministic pseudo-random number generator (LCG) to ensure
// identical chart points across every load and test run.
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate deterministic historical portfolio chart data points
function generatePortfolioHistory(days, baseValue, trendPercent, seed) {
  const rand = seededRandom(seed);
  const points = [];
  const now = new Date('2026-10-26T12:00:00Z');
  const stepGrowth = Math.pow(1 + trendPercent / 100, 1 / days);

  let current = baseValue;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    // Add realistic deterministic fluctuation (+/- 1.2%)
    const wobble = (rand() - 0.48) * 0.024;
    current = current * stepGrowth * (1 + wobble);
    points.push({
      date: dateStr,
      value: current.toFixed(2),
    });
  }
  return points;
}

export const portfolioRanges = {
  '1M': {
    rangeLabel: '1M',
    startValue: '1218500.00',
    currentValue: '1284500.00',
    changeAmount: '66000.00',
    changePercent: 0.0542, // +5.42%
    startDate: '2026-09-26',
    endDate: '2026-10-26',
    points: generatePortfolioHistory(30, 1218500, 5.42, 101),
  },
  '3M': {
    rangeLabel: '3M',
    startValue: '1165000.00',
    currentValue: '1284500.00',
    changeAmount: '119500.00',
    changePercent: 0.1026, // +10.26%
    startDate: '2026-07-26',
    endDate: '2026-10-26',
    points: generatePortfolioHistory(90, 1165000, 10.26, 202),
  },
  '6M': {
    rangeLabel: '6M',
    startValue: '1092000.00',
    currentValue: '1284500.00',
    changeAmount: '192500.00',
    changePercent: 0.1763, // +17.63%
    startDate: '2026-04-26',
    endDate: '2026-10-26',
    points: generatePortfolioHistory(180, 1092000, 17.63, 303),
  },
  '1Y': {
    rangeLabel: '1Y',
    startValue: '985000.00',
    currentValue: '1284500.00',
    changeAmount: '299500.00',
    changePercent: 0.3041, // +30.41%
    startDate: '2025-10-26',
    endDate: '2026-10-26',
    points: generatePortfolioHistory(365, 985000, 30.41, 404),
  },
};

export const walletData = {
  availableCash: '250000.00',
  investedValue: '1034500.00',
  dayPnL: '12850.50',
  dayPnLPercent: 0.0101, // +1.01%
  isDayPnLPositive: true,
  totalSimulatedPortfolio: '1284500.00',
};

export const monthlyPerformanceData = [
  { month: 'Nov', invested: 720000, returns: 32000 },
  { month: 'Dec', invested: 750000, returns: 48000 },
  { month: 'Jan', invested: 810000, returns: -14000 },
  { month: 'Feb', invested: 840000, returns: 26000 },
  { month: 'Mar', invested: 890000, returns: 58000 },
  { month: 'Apr', invested: 920000, returns: 41000 },
  { month: 'May', invested: 950000, returns: 33000 },
  { month: 'Jun', invested: 980000, returns: -22000 },
  { month: 'Jul', invested: 1010000, returns: 62000 },
  { month: 'Aug', invested: 1040000, returns: 51000 },
  { month: 'Sep', invested: 1060000, returns: 44000 },
  { month: 'Oct', invested: 1034500, returns: 66000 },
];

export const recentOrdersData = [
  {
    id: 'ord-001',
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    type: 'BUY',
    quantity: 25,
    price: '2740.50',
    totalAmount: '68512.50',
    timestamp: '2026-10-26T10:15:00Z',
    status: 'FILLED',
  },
  {
    id: 'ord-002',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    type: 'BUY',
    quantity: 15,
    price: '3890.00',
    totalAmount: '58350.00',
    timestamp: '2026-10-25T14:32:00Z',
    status: 'FILLED',
  },
  {
    id: 'ord-003',
    symbol: 'INFY',
    name: 'Infosys Limited',
    type: 'SELL',
    quantity: 40,
    price: '1820.25',
    totalAmount: '72810.00',
    timestamp: '2026-10-24T11:45:00Z',
    status: 'FILLED',
  },
  {
    id: 'ord-004',
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    type: 'BUY',
    quantity: 50,
    price: '1645.80',
    totalAmount: '82290.00',
    timestamp: '2026-10-22T09:20:00Z',
    status: 'FILLED',
  },
  {
    id: 'ord-005',
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Limited',
    type: 'SELL',
    quantity: 30,
    price: '1180.50',
    totalAmount: '35415.00',
    timestamp: '2026-10-21T15:10:00Z',
    status: 'FILLED',
  },
  {
    id: 'ord-006',
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Limited',
    type: 'BUY',
    quantity: 60,
    price: '920.00',
    totalAmount: '55200.00',
    timestamp: '2026-10-18T13:05:00Z',
    status: 'FILLED',
  },
];
