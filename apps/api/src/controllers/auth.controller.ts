import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { hashPassword } from "../config/password.js";
import { requireEmailConfig, requireWebOrigin } from "../config/env.js";
import { sendVerificationEmail, sendResetPasswordEmail } from "../services/email.js";
import { randomBytes, createHash } from "node:crypto";

const REGISTER_FIELDS = ["firstName", "lastName", "email", "password"] as const;
const RESEND_FIELDS = ["email"] as const;
const FORGOT_FIELDS = ["email"] as const;
const RESET_FIELDS = ["password"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Exact contract messages.
const MSG_CREATED = "Account created. Check your email to verify your account.";
const MSG_BAD_INPUT =
  "Missing or invalid input, malformed ID, or invalid, expired or used action token.";
const MSG_DUPLICATE = "Email address already registered.";
const MSG_INTERNAL =
  "Unexpected server, database, email or storage error. Do not expose internal details.";

// Time limit for token expiration
const VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

function validateBodyShape(
  body: unknown,
  allowed: readonly string[],
): string | null {
  // Is it a JSON object?
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "body must be a JSON object";
  }
  const obj = body as Record<string, unknown>;
  // Rejecting unknown fields
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) return `unknown field: ${key}`;
  }
  // Checks required fields
  for (const key of allowed) {
    const v = obj[key];
    if (v === undefined) return `${key} is required`;
    if (v === null) return `${key} must not be null`;
    if (typeof v !== "string") return `${key} must be a string`;
  }
  // success
  return null;
}

function validateNewPassword(password: string): string | null {
  // Do NOT trim passwords.
  if ([...password].length < 8) return "password must be at least 8 characters";
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "password must be at most 72 bytes (UTF-8)";
  }
  return null;
}

function generateVerificationToken(): { raw: string; hash: string; expires: Date } {
  const raw = randomBytes(32).toString("base64url"); // URL-safe
  const hash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + VERIFICATION_TTL_MS);
  return { raw, hash, expires };
}

function generateResetPasswordToken(): { raw: string; hash: string; expires: Date } {
  const raw = randomBytes(32).toString("base64url"); // URL-safe
  const hash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + RESET_TTL_MS);
  return { raw, hash, expires };
}

function hashTokens(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function register(req: Request, res: Response) {
  try {
    requireEmailConfig();
    requireWebOrigin();

    const shapeError = validateBodyShape(req.body, REGISTER_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const {
      firstName,
      lastName,
      email: emailRaw,
      password,
    } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    };

    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) return res.status(400).json({ error: MSG_BAD_INPUT });

    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    if (validateNewPassword(password)) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ error: MSG_DUPLICATE });

    const passwordHash = await hashPassword(password);
    const { raw, hash, expires } = generateVerificationToken();

    try {
      await User.create({
        firstName: first,
        lastName: last,
        email,
        passwordHash,
        role: "customer",
        isVerified: false,
        verificationToken: hash,
        verificationTokenExpires: expires,
      });
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: unknown }).code === 11000
      ) {
        return res.status(409).json({ error: MSG_DUPLICATE });
      }
      throw err;
    }

    await sendVerificationEmail(email, raw);
    return res.status(201).json({ message: MSG_CREATED });
  } catch (err) {
    // Never leak internal details.
    console.error("register failed:", err);
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    const raw = req.query.token;
    if (typeof raw != "string" || raw.length === 0) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const hash = hashTokens(raw);

    const user = await User.findOneAndUpdate(
      {
        verificationToken: hash,
        verificationTokenExpires: { $gt: new Date() },
      },
      {
        $set: { isVerified: true },
        $unset: { verificationToken: "", verificationTokenExpires: "" },
      },
    );
    if (!user) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    } else {
      return res.status(200).json({ message: "Email verified. You can now login." });
    }
  } catch (err) {
    // Log server-side only; the client still gets the generic message.
    console.error("verify failed:", err);
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}

export async function resendVerification(req: Request, res: Response) {
  try {
    requireEmailConfig();
    requireWebOrigin();

    const shapeError = validateBodyShape(req.body, RESEND_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const email = (req.body as { email: string }).email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }
    const { raw, hash, expires } = generateVerificationToken();
    const cooldownThreshold = new Date(Date.now() + VERIFICATION_TTL_MS - 60_000);

    const result = await User.updateOne(
      {
        email,
        isVerified: false,
        $or: [
          { verificationTokenExpires: { $exists: false } },
          { verificationTokenExpires: { $lt: cooldownThreshold } },
        ],
      },
      {
        $set: {
          verificationToken: hash,
          verificationTokenExpires: expires,
        },
      },
    );

    if (result.modifiedCount > 0) {
      await sendVerificationEmail(email, raw);
    }

    return res
      .status(200)
      .json({ message: "If this account needs verification, a verification email has been sent." });
  } catch (err) {
    // Log server-side only (same as register); the client still gets the generic message.
    console.error("resend-verification failed:", err);
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}

// Read-only: lets the website show "link expired" before the user types a new
// password (issue #113). Never consumes or extends the token.
export async function checkResetPassword(req: Request, res: Response) {
  try {
    const raw = req.query.token;
    if (typeof raw !== "string" || raw.length === 0) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const valid = await User.exists({
      resetPasswordToken: hashTokens(raw),
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!valid) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    return res.status(200).json({ message: "Reset link is valid." });
  } catch (err) {
    // Log server-side only; the client still gets the generic message.
    console.error("reset-password check failed:", err);
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const raw = req.query.token;
    if (typeof raw != "string" || raw.length === 0) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const shapeError = validateBodyShape(req.body, RESET_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const password = (req.body as { password: string }).password;
    if (validateNewPassword(password)) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const hash = hashTokens(raw);

    const user = await User.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const passwordHash = await hashPassword(password);
    const result = await User.updateOne(
      {
        resetPasswordToken: hash,
        resetPasswordExpires: { $gt: new Date() },
      },
      {
        $set: { passwordHash },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    return res.status(200).json({ message: "Password reset. Log in with your new password." });
  } catch (err) {
    // Log server-side only; the client still gets the generic message.
    console.error("reset-password failed:", err);
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    requireEmailConfig();
    requireWebOrigin();

    const shapeError = validateBodyShape(req.body, FORGOT_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const email = (req.body as { email: string }).email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }
    const { raw, hash, expires } = generateResetPasswordToken();
    const cooldownThreshold = new Date(Date.now() + RESET_TTL_MS - 60_000);

    const result = await User.updateOne(
      {
        email,
        $or: [
          { resetPasswordExpires: { $exists: false } },
          { resetPasswordExpires: { $lt: cooldownThreshold } },
        ],
      },
      {
        $set: {
          resetPasswordToken: hash,
          resetPasswordExpires: expires,
        },
      },
    );

    if (result.matchedCount === 1 && result.modifiedCount > 0) {
      await sendResetPasswordEmail(email, raw);
    }

    return res
      .status(200)
      .json({ message: "If an account exists for this email, a password-reset link has been sent." });
  } catch (err) {
    // Log server-side only; the client still gets the generic message.
    console.error("forgot-password failed:", err);
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}
