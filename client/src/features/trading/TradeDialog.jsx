import React, { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { tradingApi } from '../../api/trading.js';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatCurrency } from '../../utils/format.js';
import { multiplyRupees } from '../../utils/money.js';

const LIMIT_PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

const FRIENDLY_ERRORS = {
  INSUFFICIENT_FUNDS: 'Not enough cash for this order.',
  INSUFFICIENT_HOLDINGS: 'You do not own enough shares to sell.',
  TOO_MANY_PENDING_ORDERS: 'You have too many open orders. Cancel one and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
};

/**
 * Modal for placing a simulated market or limit order. A market order fills at the latest
 * close. A limit order fills at once if the latest close already meets your limit; otherwise
 * it waits and fills when a later close reaches it. The total shown here is only an estimate.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {'BUY'|'SELL'} props.side
 * @param {() => void} props.onClose
 * @param {string} [props.initialSymbol] - Instrument to preselect when the dialog opens
 */
export function TradeDialog({ open, side, onClose, initialSymbol }) {
  const dialogRef = useRef(null);
  const { holdings, refresh } = usePortfolio();
  const selectId = useId();
  const qtyId = useId();
  const limitId = useId();

  const [instruments, setInstruments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [orderType, setOrderType] = useState('MARKET');
  const [limitPrice, setLimitPrice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filled, setFilled] = useState(null);

  const isBuy = side === 'BUY';

  // Open/close the native dialog (gives focus trapping and Escape handling).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Reset and load instruments each time the dialog opens.
  useEffect(() => {
    if (!open) return undefined;
    setSymbol(initialSymbol ?? '');
    setQuantity('1');
    setOrderType('MARKET');
    setLimitPrice('');
    setError('');
    setFilled(null);
    setLoadError('');
    const controller = new AbortController();
    tradingApi
      .instruments(controller.signal)
      .then((data) => setInstruments(data.instruments))
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError('Could not load instruments.');
      });
    return () => controller.abort();
  }, [open, initialSymbol]);

  const heldBySymbol = new Map(holdings.map((h) => [h.symbol, h.quantity]));
  const options = isBuy ? instruments : instruments.filter((i) => heldBySymbol.has(i.symbol));
  const selected = options.find((i) => i.symbol === symbol) ?? options[0] ?? null;
  const qtyNumber = /^\d+$/.test(quantity) ? Number(quantity) : NaN;
  const isLimit = orderType === 'LIMIT';
  const limitValid = LIMIT_PRICE_PATTERN.test(limitPrice) && Number(limitPrice) > 0;
  const priceForEstimate = isLimit ? (limitValid ? limitPrice : null) : selected?.latestClose;
  const estimate =
    priceForEstimate && Number.isInteger(qtyNumber) ? multiplyRupees(priceForEstimate, qtyNumber) : null;

  const chooseOrderType = (next) => {
    setOrderType(next);
    setError('');
    if (next === 'LIMIT' && limitPrice === '' && selected?.latestClose) {
      setLimitPrice(selected.latestClose);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !selected) return;
    if (!Number.isInteger(qtyNumber) || qtyNumber < 1) {
      setError('Enter a whole number of shares, at least 1.');
      return;
    }
    if (isLimit && !limitValid) {
      setError('Enter your limit price in rupees, like 2091.81.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { order } = await tradingApi.placeOrder(selected.symbol, side, qtyNumber, {
        orderType,
        limitPrice,
      });
      setFilled(order);
      await refresh().catch(() => {});
    } catch (err) {
      setError(FRIENDLY_ERRORS[err.code] ?? err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={`${selectId}-title`}
      className="m-auto w-[min(92vw,26rem)] rounded-xl border border-line bg-surface p-0 text-fg backdrop:bg-black/60"
    >
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id={`${selectId}-title`} className="text-base font-bold">
            {isBuy ? 'Buy' : 'Sell'} shares
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {filled ? (
          <div role="status" className="space-y-4">
            <p className="rounded-lg border border-gain/30 bg-gain/10 px-3 py-2 text-sm text-gain">
              {filled.status === 'PENDING'
                ? `Limit order placed: ${filled.side === 'BUY' ? 'buy' : 'sell'} ${filled.quantity} ${filled.symbol} at ${
                    filled.side === 'BUY' ? 'or below' : 'or above'
                  } ${formatCurrency(filled.limitPrice)}. It is not filled yet. It will fill if the price reaches your limit, and you can cancel it under Open Orders.`
                : `${filled.side === 'BUY' ? 'Bought' : 'Sold'} ${filled.quantity} ${filled.symbol} at ${formatCurrency(
                    filled.price
                  )} for ${formatCurrency(filled.total)}.`}
            </p>
            <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-muted">
              Simulated order, no real money. A market order fills straight away at the latest close.
            </p>

            <div>
              <label htmlFor={selectId} className="mb-1.5 block text-xs font-semibold">
                Instrument
              </label>
              <select
                id={selectId}
                value={selected?.symbol ?? ''}
                onChange={(e) => setSymbol(e.target.value)}
                disabled={options.length === 0}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {options.map((i) => (
                  <option key={i.symbol} value={i.symbol}>
                    {i.symbol} — {i.name}
                  </option>
                ))}
              </select>
              {loadError && <p className="mt-1 text-[11px] text-loss">{loadError}</p>}
              {!loadError && !isBuy && options.length === 0 && instruments.length > 0 && (
                <p className="mt-1 text-[11px] text-muted">You do not own any shares to sell yet.</p>
              )}
            </div>

            {selected && (
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-surface-2 px-3 py-2">
                  <dt className="text-muted">Latest price</dt>
                  <dd className="font-semibold tabular-nums">
                    {selected.latestClose ? formatCurrency(selected.latestClose) : '—'}
                  </dd>
                </div>
                <div className="rounded-lg bg-surface-2 px-3 py-2">
                  <dt className="text-muted">{isBuy ? 'Shares you own' : 'Shares available'}</dt>
                  <dd className="font-semibold tabular-nums">{heldBySymbol.get(selected.symbol) ?? '0'}</dd>
                </div>
              </dl>
            )}

            <fieldset>
              <legend className="mb-1.5 block text-xs font-semibold">Order type</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['MARKET', 'Market', 'Fill now at the latest price'],
                  ['LIMIT', 'Limit', 'Wait for the price you choose'],
                ].map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-xs ${
                      orderType === value
                        ? 'border-accent bg-accent/10 text-fg'
                        : 'border-line bg-surface-2 text-muted hover:text-fg'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${selectId}-type`}
                      value={value}
                      checked={orderType === value}
                      onChange={() => chooseOrderType(value)}
                      className="sr-only"
                    />
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-[11px]">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {isLimit && (
              <div>
                <label htmlFor={limitId} className="mb-1.5 block text-xs font-semibold">
                  Limit price (₹ per share)
                </label>
                <input
                  id={limitId}
                  type="text"
                  inputMode="decimal"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value.trim())}
                  autoComplete="off"
                  required
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm tabular-nums focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                />
                <p className="mt-1 text-[11px] text-muted">
                  {isBuy
                    ? 'Fills when the price is at or below this. You pay the market price at that time, never more than your limit. Cash is set aside until then.'
                    : 'Fills when the price is at or above this. You receive the market price at that time, never less than your limit. Your shares are set aside until then.'}
                </p>
              </div>
            )}

            <div>
              <label htmlFor={qtyId} className="mb-1.5 block text-xs font-semibold">
                Quantity
              </label>
              <input
                id={qtyId}
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm tabular-nums focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              />
              {estimate && (
                <p className="mt-1 text-[11px] text-muted">
                  {isLimit
                    ? `${isBuy ? 'Most you could pay' : 'Least you would receive'}: ${formatCurrency(estimate)}`
                    : `Estimated ${isBuy ? 'cost' : 'proceeds'}: ${formatCurrency(estimate)}`}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-loss/30 bg-loss/10 px-3 py-2 text-xs text-loss">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant={isBuy ? 'buy' : 'sell'}
              size="lg"
              disabled={submitting || !selected}
              className="w-full"
            >
              {submitting
                ? 'Placing order…'
                : isLimit
                  ? `Place limit ${isBuy ? 'buy' : 'sell'}`
                  : `${isBuy ? 'Buy' : 'Sell'} ${selected?.symbol ?? ''}`.trim()}
            </Button>
          </form>
        )}
      </div>
    </dialog>
  );
}
