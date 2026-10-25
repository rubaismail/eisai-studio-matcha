
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireJwtSecret } from '../config/env.js';

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authorization.slice(7);

  if (!token || token.includes(' ')) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, requireJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (typeof decoded === 'string' || !decoded.sub) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const user = await User.findById(decoded.sub);

    if (!user || !user.isVerified) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    res.locals.authUser = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    next(error);
  }
};
