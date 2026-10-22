import app from './app.js';
import { config } from './config/index.js';

const server = app.listen(config.port, () => {
  console.log(`[Nexfolio API] Server running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(`[Nexfolio API] Allowed client origin: ${config.clientOrigin}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Nexfolio API] Port ${config.port} is already in use.`);
  } else {
    console.error('[Nexfolio API] Server error:', err);
  }
  process.exit(1);
});

function handleShutdown(signal) {
  console.log(`\n[Nexfolio API] Received ${signal}. Gracefully closing server...`);
  server.close(() => {
    console.log('[Nexfolio API] Server closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
