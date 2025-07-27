import { Router } from 'express';
import { authMiddleware, isPremiumMiddleware } from '../auth/jwt';
import multer from 'multer';
import * as scriptController from '../controllers/scriptController';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter function
const fileFilter = (req: any, file: any, cb: any) => {
  // Check file type
  const allowedTypes = ['.docx', '.txt', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
  }
};

// Set up multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

// Routes with authentication middleware
router.post('/upload', authMiddleware, upload.single('file'), scriptController.uploadScript);
router.get('/', authMiddleware, scriptController.getScripts);
router.get('/:id', authMiddleware, scriptController.getScript);
router.delete('/:id', authMiddleware, scriptController.deleteScript);

export default router;