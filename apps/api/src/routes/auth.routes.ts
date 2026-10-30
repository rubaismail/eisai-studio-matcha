import { Router } from "express";
import { register, verify, resendVerification } from "../controllers/auth.controller.js";
import { createLoginLimiters } from "../middleware/loginRateLimit.js";

const windowMs = Number(process.env.AUTH_RATE_WINDOW_MS ?? 15 * 60_000);

const registerLimiters = createLoginLimiters({
  ipLimit: Number(process.env.REGISTER_IP_LIMIT ?? 20),
  emailLimit: Number(process.env.REGISTER_EMAIL_LIMIT ?? 3),
  windowMs,
});
const resendLimiters = createLoginLimiters({
  ipLimit: Number(process.env.RESEND_IP_LIMIT ?? 10),
  emailLimit: Number(process.env.RESEND_EMAIL_LIMIT ?? 2),
  windowMs,
});

const router = Router();

router.get("/verify", verify);
router.post("/register", ...registerLimiters, register);
router.post("/resend-verification", ...resendLimiters, resendVerification);

export default router;