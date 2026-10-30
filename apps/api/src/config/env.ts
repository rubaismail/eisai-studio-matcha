
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
  mailtrapToken: process.env.MAILTRAP_TOKEN ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  appUrl: process.env.APP_URL ?? '',
  mailtrapInboxId: process.env.MAILTRAP_INBOX_ID ?? '',
  mailtrapUseSandbox: process.env.MAILTRAP_USE_SANDBOX === "true",
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

export function requireMailConfig(): { token: string; from: string } {
  if (!env.mailtrapToken) {
    throw new Error(
      'MAILTRAP_TOKEN is empty. Paste the token into apps/api/.env (see .env.example).',
    );
  }
  if (!env.emailFrom) {
    throw new Error(
      'EMAIL_FROM is empty. Set a verified sender address in apps/api/.env.',
    );
  }
  return { token: env.mailtrapToken, from: env.emailFrom };
}

// Base URL used to build links in emails. Explicit in production; localhost fallback in dev.
export function requireAppUrl(): string {
  const base = env.appUrl || `http://localhost:${env.port}`;
  return base.replace(/\/+$/, '');
}
