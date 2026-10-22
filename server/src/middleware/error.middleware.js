// Centralized error-handling middleware
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  // Log error summary safely without leaking sensitive request payloads or headers
  console.error(`[Error] ${req.method} ${req.originalUrl} - status: ${statusCode} - message: ${message}`);

  res.status(statusCode).json({
    error: {
      message,
      code: String(code),
    },
  });
};
