import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Define upload directory
const uploadDir = path.join(process.cwd(), 'server', 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure file filter (only accept PDF, DOCX, and TXT files)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['.pdf', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'), false);
  }
};

// Configure multer storage
export const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
      cb(null, uploadDir);
    },
    filename: (req: any, file: any, cb: any) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  }
});

// Error handler for multer errors
export function handleUploadErrors(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    // Multer error
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File is too large. Maximum size is 5 MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    // Other errors
    return res.status(400).json({ message: err.message });
  }
  
  next();
}

// Helper function to extract text from different file types
export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  // For TXT files, simply read the contents
  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  }
  
  // For DOCX files, use mammoth or textract (would need to be installed)
  if (ext === '.docx') {
    // This would use a library like mammoth.js to extract text
    // return await mammoth.extractRawText({ path: filePath }).then(result => result.value);
    throw new Error('DOCX parsing not implemented yet');
  }
  
  // For PDF files, use pdf-parse (would need to be installed)
  if (ext === '.pdf') {
    // This would use a library like pdf-parse
    // const pdfBuffer = fs.readFileSync(filePath);
    // return await pdfParse(pdfBuffer).then(data => data.text);
    throw new Error('PDF parsing not implemented yet');
  }
  
  throw new Error(`Unsupported file type: ${ext}`);
}