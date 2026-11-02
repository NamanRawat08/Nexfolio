/**
 * Pure function that validates environment variables and produces a frozen config object.
 * Does not import dotenv, path or url, and does not touch process.env at import time.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {Readonly<{
 *   nodeEnv: string,
 *   port: number,
 *   clientOrigin: string,
 *   databaseUrl: string,
 *   jwtSecret: string,
 *   jwtExpiresInSeconds: number,
 *   bcryptCost: number
 * }>}
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

  // Validate JWT_SECRET (required, string of at least 32 characters)
  const jwtSecret = env.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be a string of at least 32 characters');
  }

  // JWT expiration constant (86400 seconds = 1 day, not configurable)
  const jwtExpiresInSeconds = 86400;

  // Validate BCRYPT_COST (default 12; integer between 4 and 14)
  let bcryptCost = 12;
  if (env.BCRYPT_COST !== undefined && env.BCRYPT_COST !== '') {
    const rawCost = Number(env.BCRYPT_COST);
    if (!Number.isInteger(rawCost) || rawCost < 4 || rawCost > 14) {
      throw new Error('BCRYPT_COST must be an integer between 4 and 14');
    }
    bcryptCost = rawCost;
  }

  return Object.freeze({
    nodeEnv,
    port,
    clientOrigin,
    databaseUrl,
    jwtSecret,
    jwtExpiresInSeconds,
    bcryptCost,
  });
}

export default loadConfig;
