import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import mammoth from 'mammoth';

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

export interface FileValidationResult {
  isValid: boolean;
  mimeType?: string;
  error?: string;
}

export interface ProcessedFile {
  content: string;
  wordCount: number;
  pageCount: number;
  fileType: string;
}

/**
 * Magic bytes for file type validation (OWASP security best practice)
 */
const MAGIC_BYTES = {
  DOCX: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP signature for DOCX)
  DOC: [0xD0, 0xCF, 0x11, 0xE0], // Microsoft Office signature
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
};

const ALLOWED_EXTENSIONS = ['.docx', '.txt', '.pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (increased for PDF support)

/**
 * Validate file by magic bytes and whitelist extensions (OWASP recommended)
 */
export async function validateFile(filePath: string, originalName: string): Promise<FileValidationResult> {
  try {
    const stats = await fs.promises.stat(filePath);
    
    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size exceeds 5MB limit'
      };
    }

    // Check extension whitelist
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        isValid: false,
        error: 'File type not supported. Allowed: PDF, DOCX, TXT'
      };
    }

    // Read first few bytes for magic byte validation
    const buffer = await readFile(filePath);
    const firstBytes = Array.from(buffer.slice(0, 4));

    // Validate magic bytes based on extension
    if (ext === '.docx') {
      const docxMagic = MAGIC_BYTES.DOCX;
      if (!firstBytes.every((byte, index) => byte === docxMagic[index])) {
        return {
          isValid: false,
          error: 'Invalid DOCX file format'
        };
      }
      return { isValid: true, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    }

    if (ext === '.txt') {
      // Text files - basic validation
      return { isValid: true, mimeType: 'text/plain' };
    }

    if (ext === '.pdf') {
      const pdfMagic = MAGIC_BYTES.PDF;
      if (!firstBytes.every((byte, index) => byte === pdfMagic[index])) {
        return {
          isValid: false,
          error: 'Invalid PDF file format'
        };
      }
      return { isValid: true, mimeType: 'application/pdf' };
    }

    return {
      isValid: false,
      error: 'Unsupported file type'
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate file'
    };
  }
}

/**
 * Extract text content from uploaded files
 */
export async function extractTextFromFile(filePath: string, fileType: string): Promise<ProcessedFile> {
  const ext = path.extname(filePath).toLowerCase();
  let content = '';
  
  try {
    switch (ext) {
      case '.docx':
        content = await extractDocxText(filePath);
        break;
      case '.txt':
        content = await extractTxtText(filePath);
        break;
      case '.pdf':
        content = await extractPdfText(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }

    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const pageCount = estimatePageCount(content);

    return {
      content,
      wordCount,
      pageCount,
      fileType: ext.substring(1) // Remove the dot
    };
  } catch (error) {
    throw new Error(`Failed to extract text from ${ext} file: ${(error as Error).message}`);
  }
}

/**
 * Extract text from PDF files
 */
async function extractPdfText(filePath: string): Promise<string> {
  try {
    console.log('Attempting to extract PDF text from:', filePath);
    
    // Check if file exists
    try {
      await access(filePath, fs.constants.F_OK);
      console.log('PDF file exists at path');
    } catch (accessError) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }
    
    const buffer = await readFile(filePath);
    console.log('PDF buffer size:', buffer.length, 'bytes');
    
    // Use createRequire to load pdf-parse in a way that avoids startup issues
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    // Load pdf-parse only when needed
    const pdfParse = require('pdf-parse');
    
    const data = await pdfParse(buffer);
    console.log('PDF text extracted successfully, length:', data.text.length);
    
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${(error as Error).message}`);
  }
}

/**
 * Extract text from DOCX files
 */
async function extractDocxText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Extract text from TXT files
 */
async function extractTxtText(filePath: string): Promise<string> {
  return await fs.promises.readFile(filePath, 'utf-8');
}

/**
 * Estimate page count from word count (industry standard: ~250 words per page)
 */
function estimatePageCount(content: string): number {
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(wordCount / 250);
}

/**
 * Clean up temporary uploaded files
 */
export async function cleanupFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error('Failed to cleanup file:', error as Error);
  }
}