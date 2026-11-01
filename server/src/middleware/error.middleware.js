import { AppError } from '../utils/AppError.js';

// Centralized safe error-handling middleware
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Log the real error server-side with its stack, req.method and req.path only
  // Never log req.originalUrl, query string, request bodies, headers or cookies
  console.error(`[Error] ${req.method} ${req.path}:`, err && err.stack ? err.stack : err);

  // Body-parser JSON syntax error
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON',
      },
    });
  }

  // Body-parser payload too large error
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      },
    });
  }

  // Known operational application errors
  if (err instanceof AppError || (err && err.isOperational === true && typeof err.statusCode === 'number' && typeof err.code === 'string')) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // Generic unhandled errors: return opaque 500 without leaking internal error details
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
};
