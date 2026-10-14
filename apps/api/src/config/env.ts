// Loads apps/api/.env and gives the rest of the API one typed place to read settings from.
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

export const env = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  mongodbUri: process.env.MONGODB_URI ?? '',
  isProduction: process.env.NODE_ENV === 'production',
};

export function requireDatabaseUri(): string {
  if (!env.mongodbUri) {
    throw new Error(
      'MONGODB_URI is empty. Paste the Atlas connection string into apps/api/.env (see .env.example).',
    );
  }
  return env.mongodbUri;
}
