import { request } from './http.js';

/** Client for the market data, portfolio and order endpoints. */
export const tradingApi = {
  summary: (signal) => request('/portfolio/summary', { signal }),
  history: (range, signal) => request(`/portfolio/history?range=${range}`, { signal }),
  performance: (signal) => request('/portfolio/performance', { signal }),
  holdings: (signal) => request('/holdings', { signal }),
  orders: (limit, signal) => request(`/orders?limit=${limit}`, { signal }),
  instruments: (signal) => request('/instruments?limit=100', { signal }),
  watchlist: (signal) => request('/watchlist', { signal }),
  addToWatchlist: (symbol) => request(`/watchlist/${encodeURIComponent(symbol)}`, { method: 'PUT' }),
  removeFromWatchlist: (symbol) =>
    request(`/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' }),
  searchInstruments: (term, signal) =>
    request(`/instruments?limit=8&search=${encodeURIComponent(term)}`, { signal }),
  placeOrder: (symbol, side, quantity) =>
    request('/orders', { method: 'POST', body: { symbol, side, quantity } }),
};
