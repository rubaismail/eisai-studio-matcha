import type { Request, Response } from "express";
//import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import { sendVerificationEmail } from "../services/email.js";
import {randomBytes, createHash} from "node:crypto";
import { stripTypeScriptTypes } from "node:module";

const REGISTER_FIELDS = ["firstName", "lastName", "email", "password"] as const;
const RESEND_FIELDS = ["email"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Exact contract messages.
const MSG_CREATED = "Account created. Check your email to verify your account.";
const MSG_BAD_INPUT = "Missing or invalid input, malformed ID, or invalid, expired or used action token.";
const MSG_DUPLICATE = "Email address already registered.";
const MSG_INTERNAL = "Unexpected server, database, email or storage error. Do not expose internal details.";

//Time limit for token expiration
const VERIFICATION_TTL_MS = 15 * 60 * 1000 //15 minutes

async function hashPassword(password: string){
  const hash = await bcrypt.hash(password, 12);
  return hash;
}

async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(password, stored);
  return isMatch;
}

function validateBodyShape(
  body: unknown,
  allowed: readonly string[],
): string | null {
  //Is it a json object?
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return "body must be a JSON object";
  }
  const obj = body as Record<string, unknown>;
  //Rejecting unknown fields
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) return `unknown field: ${key}`;
  }
  //Checks required fields
  for (const key of allowed) {
    const v = obj[key];
    if (v === undefined) return `${key} is required`;
    if (v === null) return `${key} must not be null`;
    if (typeof v !== "string") return `${key} must be a string`;
  }
  //success
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

function generateVerificationToken(): {raw: string; hash: string; expires: Date}{
  const raw = randomBytes(32).toString("base64url"); // URL-safe
  const hash = createHash("sha256").update(raw).digest("hex");
  const expires = new Date(Date.now() + VERIFICATION_TTL_MS); //expires in
  return {raw, hash, expires};
}

function hashVerificationToken(raw:string) : string{

  return createHash("sha256").update(raw).digest("hex");
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
    const {raw, hash, expires} = generateVerificationToken();

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
    if(typeof raw != "string" || raw.length === 0){
      return res.status(400).json({error: MSG_BAD_INPUT});
    }

    const hash = hashVerificationToken(raw);

    const user = await User.findOne({
      verificationToken: hash,
      verificationTokenExpires: { $gt: new Date()},
    }).select("+verificationToken");

    if(!user) return res.status(400).json({error: MSG_BAD_INPUT});

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.status(200).json({message: "Email verified. You can now login."});
  } catch (err){
    return res.status(500).json({error: MSG_INTERNAL});
  }
}
export async function resendVerification(req: Request, res: Response) {

  try {
    const shapeError = validateBodyShape(req.body, RESEND_FIELDS);
    if (shapeError) return res.status(400).json({ error: MSG_BAD_INPUT });

    const email = (req.body as { email: string }).email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: MSG_BAD_INPUT });
    }
    const {raw, hash, expires} = generateVerificationToken();
    const user = await User.findOne({ email });

    if(!user || user.isVerified){
      return res.status(200).json("If this account needs verification, an email was sent.");
    }

    if (
      user.verificationTokenExpires &&
      user.verificationTokenExpires.getTime() - VERIFICATION_TTL_MS > Date.now() - 60_000
    ) {
      return res.status(200).json("If this account needs verification, an email was sent.");
    }

    user.verificationToken = hash;
    user.verificationTokenExpires = expires;
    await user.save();

    await sendVerificationEmail(email, raw);

    return res.status(200).json("If this account needs verification, an email was sent.");
  }catch {
    return res.status(500).json({ error: MSG_INTERNAL });
  }
}