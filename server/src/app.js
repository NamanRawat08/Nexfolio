import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { getConfig } from './config/index.js';
import { createApiRouter } from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

/**
 * Factory creating Express application instance.
 * Accepts optional configuration to allow isolated testing without process.env side effects.
 *
 * @param {object} [customConfig]
 * @returns {import('express').Express}
 */
export function createApp(customConfig) {
  const config = customConfig ?? getConfig();
  const app = express();

  // How many reverse proxies sit in front of the server (TRUST_PROXY). Needed so req.ip, which
  // rate limiting uses, is the real client and not the proxy.
  app.set('trust proxy', config.trustProxy ?? false);

  // Security headers
  app.use(helmet());

  // Cross-origin resource sharing restricted strictly to CLIENT_ORIGIN
  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    })
  );

  // Cookie parser for parsing authentication cookies
  app.use(cookieParser());

  // JSON body parser with 100kb limit (no urlencoded parser for JSON API)
  app.use(express.json({ limit: '100kb' }));

  // Request logging: concise dev format in development
  if (config.nodeEnv === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Mount API routes
  app.use('/api', createApiRouter({ config }));

  // 404 handler for unmapped routes
  app.use(notFoundHandler);

  // Centralized error handler (must come last)
  app.use(errorHandler);

  return app;
}
