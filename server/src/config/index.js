import dotenv from 'dotenv';

dotenv.config();

function validateConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowedEnvs = ['development', 'production', 'test'];
  if (!allowedEnvs.includes(nodeEnv)) {
    console.error(
      `[Config Error] NODE_ENV must be one of: ${allowedEnvs.join(', ')}. Received: "${nodeEnv}"`
    );
    process.exit(1);
  }

  const rawPort = process.env.PORT !== undefined && process.env.PORT !== '' ? process.env.PORT : '5001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(
      `[Config Error] PORT must be a valid integer between 1 and 65535. Received: "${rawPort}"`
    );
    process.exit(1);
  }

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  try {
    const parsedUrl = new URL(clientOrigin);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Protocol must be http: or https:');
    }
  } catch {
    console.error(
      `[Config Error] CLIENT_ORIGIN must be a valid URL with http or https protocol. Received: "${clientOrigin}"`
    );
    process.exit(1);
  }

  return Object.freeze({
    nodeEnv,
    port,
    clientOrigin,
  });
}

export const config = validateConfig();
