
import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

type LoginLimitOptions = {
  windowMs?: number;
  ipLimit?: number;
  emailLimit?: number;
};

export function createLoginLimiters({
  windowMs = 15 * 60 * 1000,
  ipLimit = 20,
  emailLimit = 5,
}: LoginLimitOptions = {}): RequestHandler[] {
  const options = {
    windowMs,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again later.' },
  };

  const byIp = rateLimit({
    ...options,
    limit: ipLimit,
  });

  const byEmail = rateLimit({
    ...options,
    limit: emailLimit,
    keyGenerator: (req) => {
      const email =
        typeof req.body?.email === 'string'
          ? req.body.email.trim().toLowerCase()
          : '';

      // Hash the email so it isn't used directly as a store key.
      const emailKey = createHash('sha256')
        .update(email)
        .digest('hex');

      // Invalid requests without an email use an IP-based bucket.
      return email
        ? `email:${emailKey}`
        : `invalid:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    },
  });

  return [byIp, byEmail];
}

export const loginLimiters = createLoginLimiters();

// For signed-in actions that check a password (e.g. deleting an account).
// Runs after requireAuth, so attempts are counted per account as well as per IP.
export function createAccountLimiters({
  windowMs = 15 * 60 * 1000,
  ipLimit = 20,
  userLimit = 5,
}: { windowMs?: number; ipLimit?: number; userLimit?: number } = {}): RequestHandler[] {
  const options = {
    windowMs,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again later.' },
  };

  const byIp = rateLimit({ ...options, limit: ipLimit });

  const byUser = rateLimit({
    ...options,
    limit: userLimit,
    keyGenerator: (req, res) => {
      const id = (res.locals.authUser as { id?: string } | undefined)?.id;
      return id ? `user:${id}` : `anon:${ipKeyGenerator(req.ip ?? 'unknown')}`;
    },
  });

  return [byIp, byUser];
}
