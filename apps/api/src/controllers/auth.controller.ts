import type { Request, Response } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { User } from "../models/User.js";

const SCRYPT_N = 131072;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAXMEM = 256 * 1024 * 1024;

const REGISTER_FIELDS = ["firstName", "lastName", "email", "password"] as const;
const LOGIN_FIELDS = ["email", "password"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Exact contract messages.
const MSG_CREATED =
  "Account created. Check your email to verify your account.";
const MSG_BAD_INPUT =
  "Missing or invalid input, malformed ID, or invalid, expired or used action token.";
const MSG_DUPLICATE = "Email address already registered.";
const MSG_INTERNAL =
  "Unexpected server, database, email or storage error. Do not expose internal details.";

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  opts: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, opts, (err, dk) =>
      err ? reject(err) : resolve(dk),
    );
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString(
    "base64",
  )}$${key.toString("base64")}`;
}

async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");

  const derived = await scryptAsync(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: Math.max(MAXMEM, 128 * N * r * 2),
  });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function validateBodyShape(
  body: unknown,
  allowed: readonly string[],
): string | null {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "body must be a JSON object";
  }
  const obj = body as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) return `unknown field: ${key}`;
  }
  for (const key of allowed) {
    const v = obj[key];
    if (v === undefined) return `${key} is required`;
    if (v === null) return `${key} must not be null`;
    if (typeof v !== "string") return `${key} must be a string`;
  }
  return null;
}

function validateNewPassword(password: string): string | null {
  // Do NOT trim passwords.
  if (password.length < 8) return "password must be at least 8 characters";
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "password must be at most 72 bytes (UTF-8)";
  }
  return null;
}

export async function register(req: Request, res: Response) {
  try {
    const shapeError = validateBodyShape(req.body, REGISTER_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const { firstName, lastName, email: emailRaw, password } = req.body as {
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

    try {
      await User.create({
        firstName: first,
        lastName: last,
        email,
        passwordHash,
        role: "customer",
        isVerified: false,
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

    return res.status(201).json({ message: MSG_CREATED });
  } catch {
    // Never leak internal details.
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const shapeError = validateBodyShape(req.body, LOGIN_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const { email: emailRaw, password } = req.body as {
      email: string;
      password: string;
    };

    // Login accepts any nonempty password; no trimming, no new-password policy.
    if (password.length === 0) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }

    const email = emailRaw.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) return res.status(401).json({ error: MSG_BAD_INPUT });

    const ok = await verifyPassword(user.passwordHash, password);
    if (!ok) return res.status(401).json({ error: MSG_BAD_INPUT });

    if (!user.isVerified) {
      return res.status(403).json({ error: MSG_BAD_INPUT });
    }

    return res.status(200).json({ message: "Logged in." });
  } catch {
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}