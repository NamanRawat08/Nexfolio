import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing restricted strictly to CLIENT_ORIGIN
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

// JSON body parser with sensible size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging: concise dev format in development
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Mount API routes
app.use('/api', apiRouter);

// 404 handler for unmapped routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
