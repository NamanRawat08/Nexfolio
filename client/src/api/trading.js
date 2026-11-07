import { request } from './http.js';

/** Client for the market data, portfolio and order endpoints. */
export const tradingApi = {
  summary: (signal) => request('/portfolio/summary', { signal }),
  history: (range, signal) => request(`/portfolio/history?range=${range}`, { signal }),
  performance: (signal) => request('/portfolio/performance', { signal }),
  holdings: (signal) => request('/holdings', { signal }),
  orders: (limit, signal) => request(`/orders?limit=${limit}`, { signal }),
  instruments: (signal) => request('/instruments?limit=100', { signal }),
  placeOrder: (symbol, side, quantity) =>
    request('/orders', { method: 'POST', body: { symbol, side, quantity } }),
};
