/**
 * Operational application error class.
 * Represents known, controlled domain errors that can be safely presented to clients.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine-readable error code string
   * @param {string} message - Human-readable error message
   */
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = String(code);
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default AppError;
