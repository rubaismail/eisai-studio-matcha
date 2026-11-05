import { Router } from "express";
import { register, verify, resendVerification, resetPassword, forgotPassword} from "../controllers/auth.controller.js";
import { createLoginLimiters } from "../middleware/loginRateLimit.js";

const windowMs = Number(process.env.AUTH_RATE_WINDOW_MS ?? 15 * 60_000);

const limiters = (opts: Parameters<typeof createLoginLimiters>[0]) =>
  process.env.RATE_LIMIT_DISABLED === '1' ? [] : createLoginLimiters(opts);

const registerLimiters = limiters({
  ipLimit: Number(process.env.REGISTER_IP_LIMIT ?? 20),
  emailLimit: Number(process.env.REGISTER_EMAIL_LIMIT ?? 3),
  windowMs,
});
const resendLimiters = limiters({
  ipLimit: Number(process.env.RESEND_IP_LIMIT ?? 10),
  emailLimit: Number(process.env.RESEND_EMAIL_LIMIT ?? 2),
  windowMs,
});
const forgotLimiters = limiters({
  ipLimit: Number(process.env.FORGOT_IP_LIMIT ?? 10),
  emailLimit: Number(process.env.FORGOT_EMAIL_LIMIT ?? 2),
  windowMs,
});
const resetLimiters = limiters({
  ipLimit: Number(process.env.RESET_IP_LIMIT ?? 10),
  emailLimit: Number(process.env.RESET_EMAIL_LIMIT ?? 10),
  windowMs,
});
const router = Router();

router.get("/verify", verify);
router.post("/register", ...registerLimiters, register);
router.post("/resend-verification", ...resendLimiters, resendVerification);
router.post("/forgot-password", ...forgotLimiters, forgotPassword);
router.post("/reset-password", ...resetLimiters, resetPassword);

export default router;