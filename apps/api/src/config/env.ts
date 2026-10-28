
 // Loads apps/api/.env and gives the rest of the API one typed place to read settings from.
import dotenv from 'dotenv';
import { parseTrustProxy } from './trustProxy.js';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

export const env = {
  port: Number(process.env.PORT ?? 4000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI ?? '',
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET ?? '',
};

export function requireDatabaseUri(): string {
  if (!env.mongodbUri) {
    throw new Error(
      'MONGODB_URI is empty. Paste the Atlas connection string into apps/api/.env (see .env.example).',
    );
  }

  return env.mongodbUri;
}

// Checks that JWT_SECRET is configured securely.
export function requireJwtSecret(): string {
  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }

  return env.jwtSecret;
}
