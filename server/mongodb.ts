import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGO_URI) {
  throw new Error('Missing required environment variable: MONGO_URI');
}

class MongoDB {
  private client: MongoClient;
  private db!: Db; // Definite assignment assertion
  private isConnected = false;

  constructor() {
    this.client = new MongoClient(process.env.MONGO_URI!);
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await this.client.connect();
      this.db = this.client.db('indieshots');
      this.isConnected = true;
      console.log('✓ MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await this.client.close();
    this.isConnected = false;
    console.log('MongoDB disconnected');
  }

  getDb(): Db {
    if (!this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  // Collection getters for type safety
  get scripts(): Collection<ScriptDocument> {
    return this.db.collection<ScriptDocument>('scripts');
  }

  get parseJobs(): Collection<ParseJobDocument> {
    return this.db.collection<ParseJobDocument>('parseJobs');
  }

  get shots(): Collection<ShotDocument> {
    return this.db.collection<ShotDocument>('shots');
  }

  get scriptHealthAnalysis(): Collection<ScriptHealthDocument> {
    return this.db.collection<ScriptHealthDocument>('scriptHealthAnalysis');
  }

  get sessions(): Collection<SessionDocument> {
    return this.db.collection<SessionDocument>('sessions');
  }
}

// MongoDB document interfaces matching PostgreSQL schema
export interface ScriptDocument {
  _id?: string;
  userId: string; // Firebase user ID
  title: string;
  filePath?: string;
  content?: string;
  pageCount: number;
  fileType?: string;
  fileSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParseJobDocument {
  _id?: string;
  scriptId: string; // Reference to script _id
  userId: string; // Firebase user ID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  selectedColumns: string[];
  previewData?: any;
  fullParseData?: any;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ShotDocument {
  _id?: string;
  parseJobId: string; // Reference to parseJob _id
  sceneIndex: number;
  userId: string; // Firebase user ID
  
  // Shot numbering
  shotNumberInScene: number;
  displayShotNumber?: string;
  
  // Core shot details (19 fields for CSV export)
  shotDescription?: string;
  shotType?: string;
  lens?: string;
  movement?: string;
  moodAndAmbience?: string;
  lighting?: string;
  props?: string;
  notes?: string;
  soundDesign?: string;
  colourTemp?: string;
  
  // Scene context fields
  sceneHeading?: string;
  location?: string;
  timeOfDay?: string;
  tone?: string;
  
  // Additional content fields
  characters?: string;
  action?: string;
  dialogue?: string;
  
  // Image generation fields
  imagePromptText?: string;
  imageData?: string; // Base64 encoded image data
  imageGeneratedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptHealthDocument {
  _id?: string;
  scriptId: string; // Reference to script _id
  userId: string; // Firebase user ID
  
  // Health Score Metrics
  overallScore: number;
  structureScore: number;
  pacingScore: number;
  characterScore: number;
  dialogueScore: number;
  visualScore: number;
  marketabilityScore: number;
  
  // Analysis Results
  strengths: string[];
  improvements: any[];
  genre: string;
  mood: string;
  targetAudience: string;
  marketingTags: string[];
  oneLinePitch: string;
  estimatedBudget: string;
  productionComplexity: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id?: string;
  sid: string;
  sess: any;
  expire: Date;
}

// Singleton instance
export const mongodb = new MongoDB();

// Initialize connection
export async function initializeMongoDB(): Promise<void> {
  await mongodb.connect();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongodb.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await mongodb.disconnect();
  process.exit(0);
});