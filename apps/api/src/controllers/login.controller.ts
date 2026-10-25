
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { requireJwtSecret } from '../config/env.js';

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select('+passwordHash');

  const validPassword = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

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
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
}