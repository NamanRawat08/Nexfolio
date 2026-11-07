import { formatPaiseToRupees } from '../utils/money.js';

/** Number of daily points returned for each supported range. */
export const RANGE_POINTS = Object.freeze({ '1M': 31, '3M': 91, '6M': 183, '1Y': 366 });

/**
 * Replays a user's orders over the market calendar to value the portfolio on each date:
 * value(d) = cash(d) + sum(quantity(d) * close(d)).
 *
 * Starting cash is reconstructed from the current balance and the order log, so no
 * constant is needed. Orders dated after the last price date (price data is a fixed
 * simulation that can end before the order was placed) are applied on the last date,
 * so the final point always equals the current portfolio value. Before an instrument's
 * first known close in the window, its first available close is used.
 *
 * @param {object} params
 * @param {string[]} params.dates - Ascending 'YYYY-MM-DD' market dates
 * @param {Array<{ instrumentId: string, side: string, quantity: string, totalPaise: string, date: string }>} params.orders - Oldest first
 * @param {Array<{ instrumentId: string, date: string, closePaise: string }>} params.closes
 * @param {string|bigint} params.currentCashPaise
 * @returns {Array<{ date: string, totalPaise: bigint, investedPaise: bigint }>}
 */
export function buildTimeline({ dates, orders, closes, currentCashPaise }) {
  if (dates.length === 0) return [];
  const lastDate = dates[dates.length - 1];

  let cash = BigInt(currentCashPaise);
  for (const o of orders) {
    cash += o.side === 'BUY' ? BigInt(o.totalPaise) : -BigInt(o.totalPaise);
  }

  const closeByInstrument = new Map();
  for (const c of closes) {
    if (!closeByInstrument.has(c.instrumentId)) closeByInstrument.set(c.instrumentId, new Map());
    closeByInstrument.get(c.instrumentId).set(c.date, BigInt(c.closePaise));
  }

  const effective = orders
    .map((o) => ({ ...o, date: o.date > lastDate ? lastDate : o.date }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const quantities = new Map();
  const lastPrice = new Map();
  let next = 0;
  const timeline = [];

  for (const date of dates) {
    while (next < effective.length && effective[next].date <= date) {
      const o = effective[next++];
      const qty = BigInt(o.quantity);
      if (o.side === 'BUY') {
        cash -= BigInt(o.totalPaise);
        quantities.set(o.instrumentId, (quantities.get(o.instrumentId) ?? 0n) + qty);
      } else {
        cash += BigInt(o.totalPaise);
        quantities.set(o.instrumentId, (quantities.get(o.instrumentId) ?? 0n) - qty);
      }
    }

    let invested = 0n;
    for (const [instrumentId, qty] of quantities) {
      if (qty <= 0n) continue;
      const prices = closeByInstrument.get(instrumentId);
      let price = prices?.get(date);
      if (price === undefined) {
        price = lastPrice.get(instrumentId);
      }
      if (price === undefined && prices) {
        price = prices.values().next().value;
      }
      if (price === undefined) continue;
      lastPrice.set(instrumentId, price);
      invested += price * qty;
    }

    timeline.push({ date, totalPaise: cash + invested, investedPaise: invested });
  }

  return timeline;
}

/**
 * Shapes the tail of a timeline into the range payload the dashboard chart expects.
 *
 * @param {ReturnType<typeof buildTimeline>} timeline
 * @param {'1M'|'3M'|'6M'|'1Y'} range
 */
export function buildRange(timeline, range) {
  const slice = timeline.slice(-RANGE_POINTS[range]);
  if (slice.length === 0) {
    return { rangeLabel: range, points: [], startDate: null, endDate: null };
  }
  const start = slice[0].totalPaise;
  const end = slice[slice.length - 1].totalPaise;
  const change = end - start;
  return {
    rangeLabel: range,
    startValue: formatPaiseToRupees(start),
    currentValue: formatPaiseToRupees(end),
    changeAmount: formatPaiseToRupees(change),
    changePercent: start > 0n ? Number(change) / Number(start) : 0,
    startDate: slice[0].date,
    endDate: slice[slice.length - 1].date,
    points: slice.map((p) => ({ date: p.date, value: formatPaiseToRupees(p.totalPaise) })),
  };
}

/**
 * Month-by-month view: `invested` is the value of holdings at month end and `returns` is the
 * change in total portfolio value over the month (there are no deposits or withdrawals).
 * The first month is measured from the first point in the timeline.
 *
 * @param {ReturnType<typeof buildTimeline>} timeline
 * @param {number} [months=12]
 */
export function buildMonthly(timeline, months = 12) {
  if (timeline.length === 0) return { asOf: null, months: [] };

  const lastByMonth = new Map();
  for (const p of timeline) lastByMonth.set(p.date.slice(0, 7), p);

  const keys = [...lastByMonth.keys()].sort();
  const selected = keys.slice(-months);
  const result = [];
  let baseline;
  const firstSelectedIndex = keys.indexOf(selected[0]);
  baseline = firstSelectedIndex > 0 ? lastByMonth.get(keys[firstSelectedIndex - 1]).totalPaise : timeline[0].totalPaise;

  for (const key of selected) {
    const end = lastByMonth.get(key);
    result.push({
      month: key,
      invested: formatPaiseToRupees(end.investedPaise),
      returns: formatPaiseToRupees(end.totalPaise - baseline),
    });
    baseline = end.totalPaise;
  }

  return { asOf: timeline[timeline.length - 1].date, months: result };
}

/**
 * Factory creating the portfolio history service.
 *
 * @param {object} options
 * @param {object} options.walletRepo
 * @param {object} options.orderRepo - needs listForReplay
 * @param {object} options.instrumentRepo - needs listTradeDates, getClosesForInstruments
 */
export function createPortfolioHistoryService({ walletRepo, orderRepo, instrumentRepo } = {}) {
  if (!walletRepo) throw new Error('walletRepo is required for createPortfolioHistoryService');
  if (!orderRepo) throw new Error('orderRepo is required for createPortfolioHistoryService');
  if (!instrumentRepo) throw new Error('instrumentRepo is required for createPortfolioHistoryService');

  async function getTimeline(userId) {
    const wallet = await walletRepo.findByUserId(userId);
    if (!wallet) return null;
    const dates = await instrumentRepo.listTradeDates(RANGE_POINTS['1Y']);
    if (dates.length === 0) return [];
    const orders = await orderRepo.listForReplay(userId);
    const instrumentIds = [...new Set(orders.map((o) => o.instrumentId))];
    const closes = await instrumentRepo.getClosesForInstruments(instrumentIds, dates[0]);
    return buildTimeline({ dates, orders, closes, currentCashPaise: wallet.cashPaise });
  }

  return {
    /** @returns {Promise<object|null>} range payload, or null when the user has no wallet */
    async getRange(userId, range) {
      const timeline = await getTimeline(userId);
      return timeline === null ? null : buildRange(timeline, range);
    },
    /** @returns {Promise<object|null>} monthly payload, or null when the user has no wallet */
    async getMonthly(userId) {
      const timeline = await getTimeline(userId);
      return timeline === null ? null : buildMonthly(timeline);
    },
  };
}

export default createPortfolioHistoryService;
