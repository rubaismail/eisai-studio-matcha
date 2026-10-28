
import type { RequestHandler } from 'express';

// Only allow administrators to access protected routes.
export const requireAdmin: RequestHandler = (_req, res, next) => {
  if (res.locals.authUser?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};
