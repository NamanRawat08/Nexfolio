const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;

const PASSWORD_TOO_SHORT = 'Your password is too short. Please use at least 8 characters.';
const PASSWORD_TOO_LONG = 'Your password is too long. Please use 72 characters or fewer.';
const USERNAME_INVALID =
  'Usernames must be 3 to 30 characters long and can only use letters, numbers and underscores (no spaces).';
const EMAIL_INVALID = 'Please enter a valid email address, like name@example.com.';
const LOGIN_INVALID = 'Incorrect email/username or password.';

const CODE_MESSAGES = {
  INVALID_CREDENTIALS: LOGIN_INVALID,
  EMAIL_TAKEN: 'That email is already registered. Try signing in instead.',
  USERNAME_TAKEN: 'That username is already taken. Please choose another one.',
  RATE_LIMITED: 'Too many attempts. Please wait a few minutes and try again.',
};

// The server reports every validation problem with the same code, so match on its wording.
const VALIDATION_MESSAGES = [
  [/^Password must be between/i, PASSWORD_TOO_SHORT],
  [/^Password is required/i, LOGIN_INVALID],
  [/^Username must/i, USERNAME_INVALID],
  [/^Email/i, EMAIL_INVALID],
  [/^Invalid email/i, EMAIL_INVALID],
];

/**
 * Checks the registration form before it is sent, so people get a clear message at once.
 * The password limit is in bytes (as on the server), so emoji and accented letters count extra.
 *
 * @param {{ username: string, password: string }} fields
 * @returns {string} A plain-language problem, or '' when everything looks fine
 */
export function validateRegistration({ username, password }) {
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) return USERNAME_INVALID;
  if (password.length < MIN_PASSWORD_LENGTH) return PASSWORD_TOO_SHORT;
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) return PASSWORD_TOO_LONG;
  return '';
}

/**
 * Turns an API error into a message an everyday user can act on.
 *
 * @param {{ code?: string, message?: string }} err
 * @returns {string}
 */
export function friendlyAuthError(err) {
  if (err?.code && CODE_MESSAGES[err.code]) return CODE_MESSAGES[err.code];
  if (err?.code === 'VALIDATION_ERROR') {
    const hit = VALIDATION_MESSAGES.find(([pattern]) => pattern.test(err.message ?? ''));
    if (hit) return hit[1];
  }
  return err?.message || 'Something went wrong. Please try again.';
}
