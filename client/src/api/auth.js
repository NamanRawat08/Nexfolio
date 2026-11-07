import { request } from './http.js';

export { ApiError } from './http.js';

/** Thin client for the /api/auth endpoints. */
export const authApi = {
  me: (signal) => request('/auth/me', { signal }),
  login: (identifier, password) =>
    request('/auth/login', { method: 'POST', body: { identifier, password } }),
  register: (email, username, password) =>
    request('/auth/register', { method: 'POST', body: { email, username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
};
