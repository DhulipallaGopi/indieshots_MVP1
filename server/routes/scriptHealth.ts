import { Router } from 'express';
import { authMiddleware } from '../auth/jwt';
import { generateScriptHealth, getScriptHealth } from '../controllers/scriptHealthController';

const router = Router();

/**
 * POST /api/scripts/:scriptId/health
 * Generate script health analysis
 */
router.post('/:scriptId/health', authMiddleware, generateScriptHealth);

/**
 * GET /api/scripts/:scriptId/health
 * Get script health analysis
 */
router.get('/:scriptId/health', authMiddleware, getScriptHealth);

export default router;