import { storage } from '../storage';
import { parseScriptPreview } from '../utils/scriptUtils';
import { parseScriptWithAI } from '../services/openai';
import { Script, User } from '@shared/schema';

interface ParseJob {
  id: number;
  scriptId: number;
  userId: string;
  selectedColumns: string[];
  isPremium: boolean;
}

// Simple in-memory queue implementation
const parseQueue: ParseJob[] = [];
let isProcessing = false;

/**
 * Process a script parsing job
 */
async function processParseJob(job: ParseJob): Promise<void> {
  console.log(`Processing job #${job.id} for script #${job.scriptId}`);
  
  try {
    // Update job status
    await storage.updateParseJob(job.id, {
      status: 'processing'
    });
    
    // Get script
    const script = await storage.getScript(job.scriptId);
    if (!script || !script.content) {
      throw new Error('Script content not found');
    }
    
    // Get content from script
    const content = script.content;
    
    // Parse logic depends on tier
    let parseResult;
    
    if (job.isPremium) {
      // Premium tier: full AI processing with GPT-4
      try {
        parseResult = await parseScriptWithAI({
          content,
          selectedColumns: job.selectedColumns,
          maxPages: script.pageCount || 5
        });
      } catch (error) {
        console.error('AI parsing error:', error);
        // Fallback to basic parsing if AI fails
        parseResult = parseScriptPreview(content);
      }
    } else {
      // Free tier: Basic regex parsing with optional preview
      parseResult = parseScriptPreview(content);
    }
    
    // Update job with results
    await storage.updateParseJob(job.id, {
      status: 'completed',
      fullParseData: parseResult,
      completedAt: new Date()
    });
    
    console.log(`Completed job #${job.id}`);
  } catch (error) {
    console.error(`Error processing job #${job.id}:`, error);
    
    // Update job with error
    await storage.updateParseJob(job.id, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    });
  }
}

/**
 * Start the parse worker
 */
export async function startParseWorker() {
  // Process queue one by one
  while (parseQueue.length > 0) {
    isProcessing = true;
    const job = parseQueue.shift();
    
    if (job) {
      try {
        await processParseJob(job);
      } catch (error) {
        console.error('Error in parse worker:', error);
      }
    }
  }
  
  isProcessing = false;
}

/**
 * Enqueue a new parse job
 */
export async function enqueueParseJob(job: ParseJob): Promise<void> {
  parseQueue.push(job);
  
  // Start the worker if it's not already processing
  if (!isProcessing) {
    startParseWorker().catch(error => {
      console.error('Error starting parse worker:', error);
    });
  }
}

/**
 * Generate a quick preview parse of a script
 * This is synchronous (no queueing) and uses regex for basic parsing
 */
export async function generateScriptPreview(scriptContent: string): Promise<any> {
  return parseScriptPreview(scriptContent);
}