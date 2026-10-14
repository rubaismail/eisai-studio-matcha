import { Router } from 'express';
import { listMenu } from '../controllers/menu.controller.js';

const router = Router();

router.get('/', listMenu);
// Admin routes (POST, PUT, DELETE) go here once auth middleware exists.

export default router;
