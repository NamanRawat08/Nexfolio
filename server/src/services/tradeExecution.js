/**
 * Applies a fill to a user's cash and position. Shared by immediate fills (order service)
 * and deferred limit fills (order matcher) so both follow the same rules.
 *
 * Cost basis is tracked per position. A sell removes cost pro rata (rounded down) and the
 * rest stays on the remaining shares; selling the whole position uses the exact remaining
 * cost. The caller must already hold the wallet lock and have checked funds and shares.
 *
 * @param {object} params
 * @param {{ wallet: object, holding: object }} params.repos
 * @param {string|number} params.userId
 * @param {string|number} params.instrumentId
 * @param {'BUY'|'SELL'} params.side
 * @param {bigint} params.quantity
 * @param {bigint} params.pricePaise
 * @param {bigint} params.cash - Current cash in paise
 * @param {{ quantity: bigint, totalCostPaise: bigint } | null} params.holding - Current position
 * @returns {Promise<{ newCash: bigint, totalPaise: bigint, realizedPnlPaise: bigint | null }>}
 */
export async function applyFill({ repos, userId, instrumentId, side, quantity, pricePaise, cash, holding }) {
  const totalPaise = pricePaise * quantity;
  let newCash;
  let realizedPnlPaise = null;

  if (side === 'BUY') {
    newCash = cash - totalPaise;
    await repos.holding.upsert(userId, instrumentId, {
      quantity: (holding?.quantity ?? 0n) + quantity,
      totalCostPaise: (holding?.totalCostPaise ?? 0n) + totalPaise,
    });
  } else {
    const costRemoved =
      quantity === holding.quantity ? holding.totalCostPaise : (holding.totalCostPaise * quantity) / holding.quantity;
    realizedPnlPaise = totalPaise - costRemoved;
    newCash = cash + totalPaise;
    if (quantity === holding.quantity) {
      await repos.holding.remove(userId, instrumentId);
    } else {
      await repos.holding.upsert(userId, instrumentId, {
        quantity: holding.quantity - quantity,
        totalCostPaise: holding.totalCostPaise - costRemoved,
      });
    }
  }

  await repos.wallet.setCash(userId, newCash);
  return { newCash, totalPaise, realizedPnlPaise };
}

export default { applyFill };
