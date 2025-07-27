import { Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import fs from 'fs';
import { validateFile, extractTextFromFile, cleanupFile } from '../services/fileProcessor';
import path from 'path';
import { productionQuotaManager } from '../lib/productionQuotaManager';

/**
 * Upload a script file or create from text content
 */
export async function uploadScript(req: Request, res: Response) {
  try {
    // Get authenticated user ID from request (Firebase UID)
    const userId = (req as any).user?.uid || (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    let scriptData: any;

    // Handle file upload
    if (req.file) {
      const { originalname, path: filePath, size } = req.file;
      
      // Validate file using magic bytes and extension whitelist (OWASP security)
      const validation = await validateFile(filePath, originalname);
      if (!validation.isValid) {
        await cleanupFile(filePath);
        return res.status(400).json({ message: validation.error });
      }

      // Extract text content from file
      const processedFile = await extractTextFromFile(filePath, validation.mimeType || '');
      
      scriptData = {
        userId,
        title: originalname.replace(/\.[^/.]+$/, ""), // Remove file extension
        fileType: processedFile.fileType,
        fileSize: size,
        content: processedFile.content,
        pageCount: processedFile.pageCount
      };

      // Clean up uploaded file after processing
      await cleanupFile(filePath);
    }
    // Handle text content from form data
    else if (req.body.content) {
      const content = req.body.content;
      const title = req.body.title || `Script ${new Date().toLocaleDateString()}`;
      const wordCount = content.split(/\s+/).length;
      const pageCount = Math.ceil(wordCount / 250); // Estimate 250 words per page

      scriptData = {
        userId,
        title,
        fileType: 'text',
        fileSize: Buffer.byteLength(content, 'utf8'),
        content,
        pageCount
      };
    } else {
      return res.status(400).json({ message: 'No file or content provided' });
    }

    // Get user tier from auth token
    const user = (req as any).user;
    const userTier = user?.tier || 'free';

    // Check page quota for free tier users
    const pageLimit = await productionQuotaManager.checkPageLimit(userId, scriptData.pageCount, userTier);
    if (!pageLimit.allowed) {
      return res.status(403).json({
        message: pageLimit.reason,
        requiresUpgrade: true,
        feature: 'pages',
        currentPages: scriptData.pageCount,
        maxPages: 5
      });
    }

    // Create the script record
    const script = await storage.createScript(scriptData);

    // Update user's page usage after successful upload
    await productionQuotaManager.incrementPageUsage(userId, scriptData.pageCount);

    // Create a parse job automatically
    const parseJob = await storage.createParseJob({
      scriptId: script.id,
      userId,
      selectedColumns: ['sceneHeading', 'location', 'characters', 'action'], // Default columns
      status: 'pending'
    });

    // Return the created script and parse job
    res.status(201).json({
      script: {
        id: script.id,
        title: script.title,
        fileType: script.fileType,
        fileSize: script.fileSize,
        pageCount: script.pageCount,
        createdAt: script.createdAt
      },
      parseJob: {
        id: parseJob.id,
        scriptId: parseJob.scriptId,
        status: parseJob.status
      }
    });
  } catch (error) {
    console.error('Error uploading script:', error);
    if (req.file) {
      await cleanupFile(req.file.path);
    }
    res.status(500).json({ message: 'Failed to upload script' });
  }
}

/**
 * Get a list of scripts for a user
 */
export async function getScripts(req: Request, res: Response) {
  try {
    // Get authenticated user ID from request
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const scripts = await storage.getUserScripts(userId);
    
    res.json(scripts);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ message: 'Failed to fetch scripts' });
  }
}

/**
 * Get a single script by ID
 */
export async function getScript(req: Request, res: Response) {
  try {
    const scriptId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (isNaN(scriptId)) {
      return res.status(400).json({ message: 'Invalid script ID' });
    }
    
    const script = await storage.getScript(scriptId);
    
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }
    
    // Verify ownership (Firebase user IDs are strings)
    if (script.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Return script data
    const safeScript = {
      id: script.id,
      title: script.title,
      fileType: script.fileType,
      fileSize: script.fileSize,
      pageCount: script.pageCount,
      createdAt: script.createdAt,
      content: req.query.includeContent === 'true' ? script.content : undefined
    };
    
    res.json(safeScript);
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ message: 'Server error fetching script' });
  }
}

/**
 * Delete a script
 */
export async function deleteScript(req: Request, res: Response) {
  try {
    const scriptId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (isNaN(scriptId)) {
      return res.status(400).json({ message: 'Invalid script ID' });
    }
    
    const script = await storage.getScript(scriptId);
    
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }
    
    // Check authorization - user can only delete their own scripts (Firebase user IDs are strings)
    if (script.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // First delete all related parse jobs to avoid foreign key constraint violation
    await storage.deleteParseJobsForScript(scriptId);
    
    // Delete the file from the filesystem if it exists
    if (script.filePath && fs.existsSync(script.filePath)) {
      fs.unlinkSync(script.filePath);
    }
    
    // Delete the script from the database
    await storage.deleteScript(scriptId);
    
    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ message: 'Server error deleting script' });
  }
}