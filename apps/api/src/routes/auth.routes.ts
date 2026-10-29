import { Router } from "express";
import {register, verify, resendVerification} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.get("/verify", verify);
router.post("/resend-verification", resendVerification);
export default router;