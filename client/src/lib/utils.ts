import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date string to a readable format
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a file size in bytes to a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncates a string to a given length and adds ellipsis
 */
export function truncate(str: string, length: number): string {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

/**
 * Estimates page count based on word count
 */
export function estimatePageCount(text: string): number {
  if (!text) return 0;
  // Roughly 250 words per screenplay page as an approximation
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 250) * 10) / 10);
}

/**
 * Gets file extension from a filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

/**
 * Validates file type
 */
export function isValidFileType(filename: string): boolean {
  const validTypes = ['pdf', 'docx', 'txt'];
  const ext = getFileExtension(filename).toLowerCase();
  return validTypes.includes(ext);
}

/**
 * Validates file size
 */
export function isValidFileSize(size: number): boolean {
  const maxSize = 10 * 1024 * 1024; // 10MB
  return size <= maxSize;
}

/**
 * Maps step name to step number
 */
export const stepNameToNumber: Record<string, number> = {
  'signup': 1,
  'verify': 2,
  'upload': 3,
  'columns': 4,
  'parse': 5,
  'review': 6,
  'feedback': 7
};

/**
 * Checks if a user has enough pages remaining
 */
export function hasEnoughPages(usedPages: number, totalPages: number, requiredPages: number): boolean {
  return (totalPages - usedPages) >= requiredPages;
}
