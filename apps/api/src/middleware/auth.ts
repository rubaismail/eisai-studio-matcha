import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireJwtSecret } from '../config/env.js';

function getToken(req: Request): string | null {
  const header = req.get('Authorization');
  if (!header) {
    return null;
  }

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  return token.trim() || null;
}

function setUser(req: Request, user: { id: string; role: string }) {
  (req as Request & { user?: { id: string; role: string } }).user = user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, requireJwtSecret(), { algorithms: ['HS256'] });

    if (typeof decoded === 'string' || !decoded.sub) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isVerified) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    setUser(req, { id: user.id, role: user.role });
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, requireJwtSecret(), { algorithms: ['HS256'] });

    if (typeof decoded === 'string' || !decoded.sub) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isVerified || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    setUser(req, { id: user.id, role: user.role });
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
