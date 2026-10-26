
import { Router } from 'express';
import { login } from '../controllers/login.controller.js';
import { loginLimiters } from '../middleware/loginRateLimit.js';

const router = Router();

// POST /api/auth/login
router.post('/login', ...loginLimiters, login);

export default router;
