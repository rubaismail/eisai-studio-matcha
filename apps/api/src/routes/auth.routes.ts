import { Router } from "express";
import {
  register,
  verify,
  resendVerification,
  resetPassword,
  checkResetPassword,
  forgotPassword,
} from "../controllers/auth.controller.js";
import { createAccountLimiters, createLoginLimiters } from "../middleware/loginRateLimit.js";
import { deleteAccount } from "../controllers/account.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === "1";
const limiters = (opts: Parameters<typeof createLoginLimiters>[0]) =>
  rateLimitDisabled ? [] : createLoginLimiters(opts);

const windowMs = intEnv("AUTH_RATE_WINDOW_MS", 15 * 60_000);

const registerLimiters = limiters({
  ipLimit: intEnv("REGISTER_IP_LIMIT", 20),
  emailLimit: intEnv("REGISTER_EMAIL_LIMIT", 3),
  windowMs,
});
const resendLimiters = limiters({
  ipLimit: intEnv("RESEND_IP_LIMIT", 10),
  emailLimit: intEnv("RESEND_EMAIL_LIMIT", 2),
  windowMs,
});
const forgotLimiters = limiters({
  ipLimit: intEnv("FORGOT_IP_LIMIT", 10),
  emailLimit: intEnv("FORGOT_EMAIL_LIMIT", 2),
  windowMs,
});
const resetLimiters = limiters({
  ipLimit: intEnv("RESET_IP_LIMIT", 10),
  emailLimit: intEnv("RESET_EMAIL_LIMIT", 10),
  windowMs,
});
// Separate counter so opening a reset link never uses up actual reset attempts.
const resetCheckLimiters = limiters({
  ipLimit: intEnv("RESET_CHECK_IP_LIMIT", 30),
  emailLimit: intEnv("RESET_CHECK_IP_LIMIT", 30),
  windowMs,
});
const deleteAccountLimiters = rateLimitDisabled
  ? { beforeAuth: [], afterAuth: [] }
  : createAccountLimiters({
      ipLimit: intEnv("DELETE_ACCOUNT_IP_LIMIT", 20),
      userLimit: intEnv("DELETE_ACCOUNT_USER_LIMIT", 5),
      windowMs,
    });
const router = Router();

router.get("/verify", verify);
router.post("/register", ...registerLimiters, register);
router.post("/resend-verification", ...resendLimiters, resendVerification);
router.post("/forgot-password", ...forgotLimiters, forgotPassword);
router.get("/reset-password/check", ...resetCheckLimiters, checkResetPassword);
router.post("/reset-password", ...resetLimiters, resetPassword);
// Signed-in customers delete their own account (issue #102).
router.post(
  "/delete-account",
  ...deleteAccountLimiters.beforeAuth,
  requireAuth,
  ...deleteAccountLimiters.afterAuth,
  deleteAccount,
);

export default router;