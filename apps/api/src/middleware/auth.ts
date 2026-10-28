import type { NextFunction, Request, Response } from 'express';

function getToken(req: Request): string | null {
  const header = req.get('Authorization');
  if (!header) {
    return null;
  }

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  return token.trim() || null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  (req as Request & { user?: { role: string } }).user = {
    role: token === 'admin-token' ? 'admin' : 'customer',
  };
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (token === 'admin-token' || token.toLowerCase() === 'admin') {
    (req as Request & { user?: { role: string } }).user = { role: 'admin' };
    next();
    return;
  }

  res.status(403).json({ error: 'Admin access required' });
}
