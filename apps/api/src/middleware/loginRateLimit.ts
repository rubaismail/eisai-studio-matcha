
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
