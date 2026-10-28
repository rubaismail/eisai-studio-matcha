
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireJwtSecret } from '../config/env.js';

// Precomputed bcrypt hash with cost factor 10.
// Used when no matching account exists.
const DUMMY_PASSWORD_HASH =
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const body: unknown = req.body;

  // Only email and password are allowed.
  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    res.status(400).json({ error: 'Invalid login request' });
    return;
  }

  const data = body as Record<string, unknown>;

  const keys = Object.keys(data);

  if (
    keys.some((key) => !['email', 'password'].includes(key)) ||
    keys.length !== 2
  ) {
    res.status(400).json({ error: 'Invalid login request' });
    return;
  }

  const { email, password } = data;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !password ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    res.status(400).json({ error: 'Invalid email or password format' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select('+passwordHash');

  // Always perform a bcrypt comparison, even for unknown emails.
  const validPassword = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!user || !validPassword) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  if (!user.isVerified) {
    res.status(403).json({ error: 'Please verify your email first' });
    return;
  }

  const token = jwt.sign({}, requireJwtSecret(), {
    subject: user.id,
    expiresIn: '1h',
    algorithm: 'HS256',
  });

  res.json({
    token,
    user: {
      _id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}