// Shared type definitions for the IndieShots application

export interface Script {
  id: number;
  title: string;
  fileType: string;
  fileSize: number;
  pageCount: number;
  createdAt: Date | string;
  userId?: number;
  content?: string;
}

export interface ParseJob {
  id: number;
  scriptId: number;
  userId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  selectedColumns: string[];
  previewData?: any;
  fullParseData?: any;
  errorMessage?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface User {
  id: string | number;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  tier: 'free' | 'premium';
  totalPages: number;
  usedPages: number;
  createdAt: Date | string;
  updatedAt: Date | string;
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

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}