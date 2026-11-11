import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// Settings shared by every auth limiter.
function limiterOptions(windowMs: number, error: string) {
  return {
    windowMs,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    message: { error },
  };
}

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
  const options = limiterOptions(
    windowMs,
    'Too many login attempts. Try again later.',
  );

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
      const emailKey = createHash('sha256').update(email).digest('hex');

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
// Mount `beforeAuth` before requireAuth so every request counts against the IP,
// including ones with bad tokens; mount `afterAuth` after it to count per account.
export function createAccountLimiters({
  windowMs = 15 * 60 * 1000,
  ipLimit = 20,
  userLimit = 5,
}: { windowMs?: number; ipLimit?: number; userLimit?: number } = {}): {
  beforeAuth: RequestHandler[];
  afterAuth: RequestHandler[];
} {
  const options = limiterOptions(
    windowMs,
    'Too many attempts. Try again later.',
  );

  const byIp = rateLimit({ ...options, limit: ipLimit });

  const byUser = rateLimit({
    ...options,
    limit: userLimit,
    keyGenerator: (_req, res) => {
      const id = (res.locals.authUser as { id?: string } | undefined)?.id;
      if (!id) throw new Error('afterAuth limiters must run after requireAuth');
      return `user:${id}`;
    },
  });

  return { beforeAuth: [byIp], afterAuth: [byUser] };
}
