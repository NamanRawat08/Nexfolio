import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { loadConfig } from './loadConfig.js';

// Resolve .env path relative to this file's location so it works from any working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

/**
 * Builds the configuration on demand from process.env.
 * Throws an Error on invalid configuration.
 *
 * @returns {Readonly<{ nodeEnv: string, port: number, clientOrigin: string, databaseUrl: string }>}
 */
export function getConfig() {
  return loadConfig(process.env);
}

// Re-export pure loadConfig
export { loadConfig };
