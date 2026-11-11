import type { Request, Response } from 'express';
import { User } from '../models/User.js';
import { verifyPassword } from '../config/password.js';

// POST /api/auth/delete-account (issue #102)
// Permanently deletes the signed-in user's own account. The current password is
// required so a session left open on a shared device can't be used to delete it.
// The User document is the only place customer data lives (favorites included).
export async function deleteAccount(req: Request, res: Response) {
  const body: unknown = req.body;

  if (
    body === null ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    typeof (body as Record<string, unknown>).password !== 'string' ||
    !(body as { password: string }).password
  ) {
    res.status(400).json({ error: 'Enter your current password' });
    return;
  }

  const { password } = body as { password: string };
  const { id } = res.locals.authUser as { id: string };

  const user = await User.findById(id).select('+passwordHash');

  // requireAuth found this user a moment ago; if it's gone now, treat the
  // session as no longer valid.
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // 403, not 401: the user is signed in, and clients treat any 401 as
  // "signed out" and clear the session, which would hide this message.
  if (!(await verifyPassword(user.passwordHash, password))) {
    res.status(403).json({ error: 'Incorrect password' });
    return;
  }

  // Never remove the last admin who can log in: the client would be locked out
  // of the dashboard. Unverified admins can't log in, so they don't count.
  // Not atomic: two admins deleting at the same instant could both pass. Recover
  // with docs/admin-account-setup.md if that ever happens.
  if (user.role === 'admin') {
    const admins = await User.countDocuments({
      role: 'admin',
      isVerified: true,
    });
    if (admins <= 1) {
      res.status(409).json({
        error:
          'This is the only admin account. Make another account an admin before deleting this one.',
      });
      return;
    }
  }

  const { deletedCount } = await User.deleteOne({ _id: user._id });

  // Already deleted by a request that ran at the same time.
  if (deletedCount === 0) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // requireAuth looks the user up on every request, so this account's login
  // token stops working immediately.
  res.json({ message: 'Account deleted.' });
}
