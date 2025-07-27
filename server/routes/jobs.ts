import { Router } from 'express';
import { authMiddleware, isPremiumMiddleware } from '../auth/jwt';
import * as parseController from '../controllers/parseController';

const router = Router();

// Parse job routes with authentication middleware
router.post('/', authMiddleware, parseController.createParseJob);
router.post('/:id/parse', authMiddleware, parseController.startParseJob);
router.get('/', authMiddleware, parseController.getParseJobs);
router.get('/:id', authMiddleware, parseController.getParseJob);
router.patch('/:id/columns', authMiddleware, parseController.updateParseJobColumns);
router.get('/:id/download', authMiddleware, parseController.downloadJobResults);

export default router;