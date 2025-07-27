// Client-side type definitions for IndieShots application

export interface Script {
  id: number;
  title: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  createdAt: string | Date;
  userId?: number;
  content?: string;
}

export interface ParseJob {
  id: number;
  scriptId: number;
  userId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  selectedColumns: string[];
  previewData?: {
    scenes?: ParsedScene[];
  };
  fullParseData?: any[];
  errorMessage?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ParsedScene {
  sceneNumber?: number;
  sceneHeading?: string;
  location?: string;
  time?: string;
  characters?: string[];
  props?: string[];
  tone?: string;
  cameraMovement?: string;
  action?: string;
  dialogue?: string;
}

export interface User {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string | null;
  tier: 'free' | 'premium';
  totalPages: number | null;
  usedPages: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}