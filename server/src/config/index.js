import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Resolve .env path relative to this file's location so it works from any working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

/**
 * Pure function that validates environment variables and produces a frozen config object.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {Readonly<{ nodeEnv: string, port: number, clientOrigin: string, databaseUrl: string }>}
 */
export function loadConfig(env = process.env) {
  // Validate NODE_ENV
  const nodeEnv = env.NODE_ENV !== undefined && env.NODE_ENV !== '' ? env.NODE_ENV : 'development';
  const allowedEnvs = ['development', 'production', 'test'];
  if (!allowedEnvs.includes(nodeEnv)) {
    throw new Error('NODE_ENV must be one of: development, production, test');
  }

  // Validate PORT
  const rawPort = env.PORT !== undefined && env.PORT !== '' ? env.PORT : '5001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  // Validate CLIENT_ORIGIN
  const clientOrigin = env.CLIENT_ORIGIN !== undefined && env.CLIENT_ORIGIN !== '' ? env.CLIENT_ORIGIN : 'http://localhost:5173';
  try {
    const parsedUrl = new URL(clientOrigin);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error('CLIENT_ORIGIN must be a valid HTTP or HTTPS URL');
  }

  // Validate DATABASE_URL (required, non-empty, must start with postgres:// or postgresql://)
  const databaseUrl = env.DATABASE_URL;
  if (
    typeof databaseUrl !== 'string' ||
    databaseUrl.trim() === '' ||
    (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://'))
  ) {
    throw new Error('DATABASE_URL must be a non-empty string starting with postgres:// or postgresql://');
  }

  return Object.freeze({
    nodeEnv,
    port,
    clientOrigin,
    databaseUrl,
  });
}

let _defaultConfig;
try {
  _defaultConfig = loadConfig(process.env);
} catch {
  // Deferred if process.env is incomplete at module import time
}

// Export default config built from process.env
export const config = new Proxy({}, {
  get(target, prop) {
    if (!_defaultConfig) {
      _defaultConfig = loadConfig(process.env);
    }
    return _defaultConfig[prop];
  },
  ownKeys() {
    if (!_defaultConfig) {
      _defaultConfig = loadConfig(process.env);
    }
    return Reflect.ownKeys(_defaultConfig);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (!_defaultConfig) {
      _defaultConfig = loadConfig(process.env);
    }
    return Reflect.getOwnPropertyDescriptor(_defaultConfig, prop);
  },
});
