
 // Loads apps/api/.env and gives the rest of the API one typed place to read settings from.
import dotenv from 'dotenv';
import { parseTrustProxy } from './trustProxy.js';
import { fileURLToPath } from 'node:url';

const EMAIL_FROM_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  mailtrapUseSandbox: process.env.MAILTRAP_USE_SANDBOX ?? '',
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? 'eisai-menu-images',
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  awsSessionToken: process.env.AWS_SESSION_TOKEN ?? '',
  awsS3PublicUrl: process.env.AWS_S3_PUBLIC_URL ?? '',
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

export function requireEmailConfig(): {
  token: string;
  from: string;
  sandbox: boolean;
  inboxId?: number;
  appUrl: string;
} {
  const mail = requireMailConfig();
  const appUrl = requireAppUrl();
  return { ...mail, appUrl };
}

function requireMailConfig(): {
  token: string;
  from: string;
  sandbox: boolean;
  inboxId?: number;
} {

  const token = env.mailtrapToken.trim();
  const from = env.emailFrom.trim();

  if (!token) throw new Error("MAILTRAP_TOKEN is required.");
  if (!from) throw new Error("EMAIL_FROM is required.");
  if (!EMAIL_FROM_RE.test(from)) {
    throw new Error("EMAIL_FROM must be a valid email address.");
  }

  if (env.mailtrapUseSandbox !== 'true' && env.mailtrapUseSandbox !== 'false') {
    throw new Error('MAILTRAP_USE_SANDBOX must be exactly "true" or "false".');
  }
  const sandbox = env.mailtrapUseSandbox === 'true';

  let inboxId: number | undefined;
  if (sandbox) {
    if (!env.mailtrapInboxId) {
      throw new Error('MAILTRAP_INBOX_ID is required in sandbox mode.');
    }
    inboxId = Number(env.mailtrapInboxId);
    if (!Number.isInteger(inboxId) || inboxId <= 0) {
      throw new Error('MAILTRAP_INBOX_ID must be a positive integer.');
    }
  }

  return { token, from, sandbox, inboxId };
}

// Base URL used to build links in emails. Explicit in production; localhost fallback in dev.
function requireAppUrl(): string {
  const raw = env.appUrl.trim();

  if (!raw) {
    if (env.isProduction) {
      throw new Error('APP_URL must be set in production.');
    }
    return `http://localhost:${env.port}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('APP_URL must be a valid absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('APP_URL must use http or https.');
  }

  return parsed.origin + parsed.pathname.replace(/\/+$/, '');
}

// Verification and password-reset emails open website pages, which call the API.
export function requireWebOrigin(): string {
  let url: URL;
  try {
    url = new URL(env.webOrigin.trim());
  } catch {
    throw new Error('WEB_ORIGIN must be a valid absolute URL for email links.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('WEB_ORIGIN must use http or https without credentials.');
  }
  return url.origin;
}
