/**
 * Shapes the portfolio into slices for the allocation view: cash plus one slice per sector,
 * largest first, with each slice's share of the total. Display only: the server owns the real
 * totals, and these numbers are used for bar widths and percentages.
 *
 * @param {object} params
 * @param {string} params.cash - Available cash in rupees, e.g. '353266.12'
 * @param {Array<{ sector: string, value: string|null, totalCost: string }>} params.holdings
 * @returns {{ total: number, slices: Array<{ label: string, value: number, share: number, kind: 'cash'|'sector' }> }}
 */
export function buildAllocation({ cash, holdings }) {
  const bySector = new Map();
  for (const h of holdings) {
    // A position without a price is valued at cost, like the server does.
    const amount = Number.parseFloat(h.value ?? h.totalCost);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + amount);
  }

  const cashAmount = Number.parseFloat(cash);
  const slices = [...bySector.entries()].map(([label, value]) => ({ label, value, kind: 'sector' }));
  if (Number.isFinite(cashAmount) && cashAmount > 0) {
    slices.push({ label: 'Cash', value: cashAmount, kind: 'cash' });
  }

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  slices.sort((a, b) => b.value - a.value);
  return {
    total,
    slices: slices.map((s) => ({ ...s, share: total > 0 ? s.value / total : 0 })),
  };
}
