/**
 * SAMPLE DATA ONLY — Nexfolio Trading Simulation.
 * Not real market data, not connected to any external exchange or live API.
 *
 * NOTE ON MONEY REPRESENTATION & ARITHMETIC:
 * Monetary amounts are represented as strings (e.g. "1284500.00") rather than
 * JavaScript floating-point numbers. This mirrors PostgreSQL NUMERIC / DECIMAL
 * responses over JSON and avoids binary IEEE-754 precision loss.
 *
 * All range calculations here are performed using integer paise (Math.round(x * 100))
 * for exact arithmetic. In production, a real API will compute these figures
 * server-side directly from database NUMERIC columns.
 */

export const SAMPLE_AS_OF = '2026-10-26'; // Fixed deterministic sample as-of date

// Simple deterministic pseudo-random number generator (LCG)
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate ONE single deterministic historical series of 366 daily points
 * spanning exactly 365 days ending on SAMPLE_AS_OF (2026-10-26).
 *
 * Keyframes are designed so:
 * - 1Y change is positive (+31.07%)
 * - 6M change is positive (+17.84%)
 * - 3M change is positive (+10.26%)
 * - 1M change is modestly negative (-2.10%) to exercise loss styling
 * - Final point is exactly 1284500.00 INR (128,450,000 paise)
 */
function generateMasterSeries() {
  const TOTAL_DAYS = 365; // 366 daily points: index 0 to 365
  const TARGET_FINAL_PAISE = 128450000; // 1,284,500.00 INR
  const asOf = new Date(SAMPLE_AS_OF + 'T00:00:00Z');
  const rand = seededRandom(42);

  const keyframes = [
    { day: 0, paise: 98000000 },    // 1Y start (~980,000 INR)
    { day: 183, paise: 109000000 }, // 6M start (~1,090,000 INR)
    { day: 275, paise: 116500000 }, // 3M start (~1,165,000 INR)
    { day: 335, paise: 131200000 }, // 1M start (~1,312,000 INR -> negative to final)
    { day: 365, paise: 128450000 }, // Final point: exactly 1,284,500.00 INR
  ];

  const points = [];
  for (let k = 0; k < keyframes.length - 1; k++) {
    const startKf = keyframes[k];
    const endKf = keyframes[k + 1];
    const span = endKf.day - startKf.day;

    for (let d = startKf.day; d < endKf.day; d++) {
      const progress = (d - startKf.day) / span;
      const base = startKf.paise + (endKf.paise - startKf.paise) * progress;
      const wobbleFactor = Math.sin(progress * Math.PI) * (rand() - 0.5) * 0.015;
      const paise = Math.round(base * (1 + wobbleFactor));

      const dt = new Date(asOf.getTime() - (TOTAL_DAYS - d) * 86400000);
      points.push({
        date: dt.toISOString().slice(0, 10),
        value: (paise / 100).toFixed(2),
      });
    }
  }

  // Exact final point
  points.push({
    date: SAMPLE_AS_OF,
    value: (TARGET_FINAL_PAISE / 100).toFixed(2),
  });

  return points;
}

// Single source of truth for portfolio history (366 daily points)
export const masterPortfolioSeries = generateMasterSeries();

/**
 * Derive range summary from a slice of the master series.
 * Performs money arithmetic in integer paise.
 *
 * @param {Array<{date: string, value: string}>} seriesSlice
 * @param {string} rangeLabel
 */
function buildRange(seriesSlice, rangeLabel) {
  const startPaise = Math.round(parseFloat(seriesSlice[0].value) * 100);
  const endPaise = Math.round(parseFloat(seriesSlice[seriesSlice.length - 1].value) * 100);
  const changePaise = endPaise - startPaise;

  return {
    rangeLabel,
    startValue: (startPaise / 100).toFixed(2),
    currentValue: (endPaise / 100).toFixed(2),
    changeAmount: (changePaise / 100).toFixed(2),
    changePercent: changePaise / startPaise,
    startDate: seriesSlice[0].date,
    endDate: seriesSlice[seriesSlice.length - 1].date,
    points: seriesSlice,
  };
}

// Ranges derived by slicing the tail of the single master series:
// 1M = 30 days (31 points)
// 3M = 90 days (91 points)
// 6M = 182 days (183 points)
// 1Y = 365 days (366 points)
export const portfolioRanges = {
  '1M': buildRange(masterPortfolioSeries.slice(-31), '1M'),
  '3M': buildRange(masterPortfolioSeries.slice(-91), '3M'),
  '6M': buildRange(masterPortfolioSeries.slice(-183), '6M'),
  '1Y': buildRange(masterPortfolioSeries.slice(-366), '1Y'),
};

// Available cash (250,000.00) + Invested value (1,034,500.00) = 1,284,500.00
// Exactly consistent with portfolio currentValue
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
