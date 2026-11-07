/**
 * Thin client for the /api/auth endpoints. Cookies carry the session,
 * so no token is ever read or stored in JavaScript.
 */

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    const init = { method, credentials: 'same-origin', signal };
    if (body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    res = await fetch(`/api/auth${path}`, init);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Please try again.');
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. proxy error page); fall through to generic error
  }

  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? 'Something went wrong. Please try again.'
    );
  }
  return data;
}

export const authApi = {
  me: (signal) => request('/me', { signal }),
  login: (identifier, password) => request('/login', { method: 'POST', body: { identifier, password } }),
  register: (email, username, password) =>
    request('/register', { method: 'POST', body: { email, username, password } }),
  logout: () => request('/logout', { method: 'POST' }),
};
