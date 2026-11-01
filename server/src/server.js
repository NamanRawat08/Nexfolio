import { loadConfig } from './config/index.js';

let config;
try {
  config = loadConfig(process.env);
} catch (err) {
  console.error(`Invalid configuration: ${err.message}`);
  process.exit(1);
}

const { default: app } = await import('./app.js');

// Registry of async cleanup functions run during graceful shutdown
// (e.g. pg Pool termination will be registered here)
export const cleanupTasks = [];

let isShuttingDown = false;

export function shutdown(exitCode = 0, signal = 'SHUTDOWN') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Nexfolio API] Received ${signal}. Gracefully closing server...`);

  // Force exit after 10 seconds if graceful shutdown does not complete
  const forceTimer = setTimeout(() => {
    console.error('[Nexfolio API] Shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  const runCleanup = async () => {
    for (const task of cleanupTasks) {
      try {
        await task();
      } catch (taskErr) {
        console.error('[Nexfolio API] Cleanup task failed:', taskErr && taskErr.stack ? taskErr.stack : taskErr);
      }
    }
    console.log('[Nexfolio API] Server closed cleanly.');
    process.exit(exitCode);
  };

  if (server && server.listening) {
    server.close((closeErr) => {
      if (closeErr) {
        console.error('[Nexfolio API] Error closing HTTP server:', closeErr && closeErr.stack ? closeErr.stack : closeErr);
      }
      runCleanup();
    });
  } else {
    runCleanup();
  }
}

const server = app.listen(config.port, () => {
  console.log(`[Nexfolio API] Server running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(`[Nexfolio API] Allowed client origin: ${config.clientOrigin}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Nexfolio API] Port ${config.port} is already in use.`);
  } else {
    console.error('[Nexfolio API] Server error:', err && err.stack ? err.stack : err);
  }
  process.exit(1);
});

process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));
process.on('SIGINT', () => shutdown(0, 'SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Nexfolio API] Uncaught Exception:', err && err.stack ? err.stack : err);
  shutdown(1, 'uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Nexfolio API] Unhandled Rejection:', reason && reason.stack ? reason.stack : reason);
  shutdown(1, 'unhandledRejection');
});

export default server;
