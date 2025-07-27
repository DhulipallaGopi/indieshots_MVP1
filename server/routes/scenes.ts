import { Router } from 'express';
import { Request, Response } from 'express';
import { authMiddleware } from '../auth/jwt';
import { tierValidationMiddleware } from '../middleware/tierValidation';
import { storage } from '../storage';
import { extractScenesFromText } from '../services/sceneProcessor';
import { generateShotsFromScene } from '../services/shotGenerator';
import { productionQuotaManager } from '../lib/productionQuotaManager';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Simple debug endpoint to check authentication without middleware
router.get('/debug/auth-test', async (req: Request, res: Response) => {
  try {
    console.log('🔍 AUTH DEBUG: Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 AUTH DEBUG: Cookies:', JSON.stringify(req.cookies, null, 2));

    res.json({
      message: 'Auth debug endpoint reached',
      headers: req.headers,
      cookies: req.cookies,
      hasAuthCookie: !!req.cookies?.authToken,
      hasSessionCookie: !!req.cookies?.['connect.sid']
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    res.status(500).json({ error: 'Auth debug failed' });
  }
});

// In-memory storage for scenes and shots (replace with database in production)
const scenesStorage = new Map<string, any>();
const shotsStorage = new Map<string, any[]>();

/**
 * GET /api/scenes/:jobId
 * Get scenes for a parse job
 */
router.get('/jobs/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.uid || (req as any).user?.id;

    // Get the parse job
    const parseJob = await storage.getParseJob(parseInt(jobId));
    if (!parseJob || parseJob.userId !== userId) {
      return res.status(404).json({ error: 'Parse job not found' });
    }

    // Check if scenes are already extracted
    const scenesKey = `job_${jobId}_scenes`;
    if (scenesStorage.has(scenesKey)) {
      const scenes = scenesStorage.get(scenesKey);
      return res.json({ scenes });
    }

    // Get the script content
    const script = await storage.getScript(parseJob.scriptId);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Extract scenes from the script content
    if (script.content) {
      const scenes = await extractScenesFromText(script.content);

      // Store scenes in memory
      scenesStorage.set(scenesKey, scenes);

      return res.json({ scenes });
    } else {
      return res.status(400).json({ error: 'Script content is empty' });
    }
  } catch (error) {
    console.error('Error getting scenes:', error);
    res.status(500).json({ error: 'Failed to get scenes' });
  }
});

/**
 * POST /api/shots/generate/:jobId/:sceneIndex
 * Generate shots for a specific scene
 */
router.post('/shots/generate/:jobId/:sceneIndex', authMiddleware, tierValidationMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, sceneIndex } = req.params;
    const userId = (req as any).user?.uid || (req as any).user?.id;
    const user = (req as any).user;

    console.log(`🎬 SHOT GENERATION REQUEST - START`);
    console.log(`JobId: ${jobId}, SceneIndex: ${sceneIndex}`);
    console.log(`User ID: ${userId}`);
    console.log(`User object:`, JSON.stringify(user, null, 2));

    // Verify user owns the job
    const parseJob = await storage.getParseJob(parseInt(jobId));
    if (!parseJob || parseJob.userId !== userId) {
      return res.status(404).json({ error: 'Parse job not found' });
    }

    // Get the scene data from the parse job
    let fullParseData;
    if (typeof parseJob.fullParseData === 'string') {
      try {
        fullParseData = JSON.parse(parseJob.fullParseData);
      } catch (error) {
        console.error('Error parsing fullParseData:', error);
        return res.status(400).json({ error: 'Invalid parse data format' });
      }
    } else {
      fullParseData = parseJob.fullParseData;
    }

    const scenes = fullParseData?.scenes || [];
    const scene = scenes[parseInt(sceneIndex)];

    if (!scene) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    console.log(`📝 Scene content:`, scene);

    // Check tier-based shot limits
    const userTier = user?.tier || 'free';
    console.log(`User tier: ${userTier}`);

    let tierLimitWarning = null;

    // Generate shots using AI
    console.log(`🤖 Generating shots with AI for scene: ${scene.sceneHeading}`);
    const sceneText = scene.content || scene.text || scene.rawTextContent || '';
    console.log(`📝 Scene text length: ${sceneText.length} characters`);
    console.log(`📝 Scene text preview: ${sceneText.substring(0, 100)}...`);
    const generatedShots = await generateShotsFromScene(sceneText, scene.sceneHeading || '', parseInt(sceneIndex) + 1);
    console.log(`Generated ${generatedShots.length} shots`);

    // Apply tier-based limits
    let limitedShots = generatedShots;
    if (userTier === 'free') {
      const maxShots = 5;
      if (generatedShots.length > maxShots) {
        limitedShots = generatedShots.slice(0, maxShots);
        tierLimitWarning = {
          limitApplied: true,
          message: `Free tier limited to ${maxShots} shots per scene. Upgrade to Pro for unlimited shots.`,
          totalGenerated: generatedShots.length,
          limitedTo: maxShots
        };
        console.log(`⚠️ Applied free tier limit: ${generatedShots.length} -> ${maxShots} shots`);
      }
    }

    // Store shots in database with proper structure
    console.log(`📊 Generated ${limitedShots.length} shots to store`);
    
    const shotsToStore = limitedShots.map((shot: any, index: number) => {
      const shotData = {
        parseJobId: parseInt(jobId),
        sceneIndex: parseInt(sceneIndex),
        userId: userId,
        shotNumberInScene: shot.shotNumber || index + 1,
        displayShotNumber: shot.displayShotNumber || `${index + 1}`,
        shotDescription: shot.shotDescription || '',
        shotType: shot.shotType || '',
        lens: shot.lens || '',
        movement: shot.movement || '',
        moodAndAmbience: shot.moodAndAmbience || '',
        lighting: shot.lighting || '',
        props: shot.props || '',
        notes: shot.notes || '',
        soundDesign: shot.soundDesign || '',
        colourTemp: shot.colourTemp || '',
        sceneHeading: shot.sceneHeading || scene.sceneHeading || '',
        location: shot.location || scene.location || '',
        timeOfDay: shot.timeOfDay || scene.timeOfDay || '',
        tone: shot.tone || scene.tone || '',
        characters: shot.characters || '',
        action: shot.action || '',
        dialogue: shot.dialogue || '',
      };
      
      console.log(`📝 Shot ${index + 1} data:`, {
        shotDescription: shotData.shotDescription.substring(0, 50) + '...',
        shotType: shotData.shotType,
        parseJobId: shotData.parseJobId,
        userId: shotData.userId
      });
      
      return shotData;
    });

    // Delete existing shots for this scene and create new ones
    console.log(`About to delete existing shots for job ${jobId}, scene ${sceneIndex}`);
    await storage.deleteShots(parseInt(jobId), parseInt(sceneIndex));

    console.log(`About to create ${shotsToStore.length} shots:`, shotsToStore.map(s => ({ 
      parseJobId: s.parseJobId, 
      sceneIndex: s.sceneIndex, 
      userId: s.userId,
      shotDescription: s.shotDescription 
    })));

    const createdShots = await storage.createShots(shotsToStore);
    console.log(`Created ${createdShots.length} shots in database`);

    const response = { 
      message: 'Shots generated successfully',
      shotCount: createdShots.length,
      shots: createdShots,
      ...(tierLimitWarning || {})
    };

    res.json(response);
  } catch (error) {
    console.error('🚨 Error generating shots:', error);
    console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({ 
      error: 'Failed to generate shots',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/shots/:jobId
 * Get all shots for a job across all scenes
 */
router.get('/shots/:jobId', authMiddleware, tierValidationMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.uid || (req as any).user?.id;

    console.log(`GET all shots - jobId: ${jobId}, userId: ${userId}`);

    // Verify user owns the job
    const parseJob = await storage.getParseJob(parseInt(jobId));
    console.log(`Parse job found:`, parseJob ? `ID ${parseJob.id}, userId ${parseJob.userId}` : 'null');

    if (!parseJob || parseJob.userId !== userId) {
      console.log(`Access denied - parseJob exists: ${!!parseJob}, userIds match: ${parseJob?.userId === userId}`);
      return res.status(404).json({ error: 'Parse job not found' });
    }

    // Get all shots from all scenes for this job
    const allShots = [];

    // Handle fullParseData which might already be an object or a string
    let parsedData;
    if (typeof parseJob.fullParseData === 'string') {
      try {
        parsedData = JSON.parse(parseJob.fullParseData);
      } catch (error) {
        console.error('Error parsing fullParseData:', error);
        parsedData = parseJob.fullParseData;
      }
    } else {
      parsedData = parseJob.fullParseData;
    }

    const scenes = parsedData?.scenes || [];
    console.log(`Found ${scenes.length} scenes in fullParseData`);

    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
      try {
        const sceneShots = await storage.getShots(parseInt(jobId), sceneIndex);
        console.log(`Scene ${sceneIndex}: ${sceneShots.length} shots`);
        allShots.push(...sceneShots);
      } catch (sceneError) {
        console.error(`Error getting shots for scene ${sceneIndex}:`, sceneError);
        // Continue with other scenes even if one fails
      }
    }

    console.log(`Total shots across all scenes: ${allShots.length}`);
    res.json({ shots: allShots });
  } catch (error) {
    console.error('Error getting all shots:', error);
    res.status(500).json({ error: 'Failed to get shots' });
  }
});

/**
 * GET /api/shots/:jobId/:sceneIndex
 * Get shots for a specific scene
 */
router.get('/shots/:jobId/:sceneIndex', authMiddleware, tierValidationMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId, sceneIndex } = req.params;
    const userId = (req as any).user?.uid || (req as any).user?.id;

    console.log(`GET shots - jobId: ${jobId}, userId: ${userId}`);

    // Verify user owns the job
    const parseJob = await storage.getParseJob(parseInt(jobId));
    console.log(`Parse job found:`, parseJob ? `ID ${parseJob.id}, userId ${parseJob.userId}` : 'null');

    if (!parseJob || parseJob.userId !== userId) {
      console.log(`Access denied - parseJob exists: ${!!parseJob}, userIds match: ${parseJob?.userId === userId}`);
      return res.status(404).json({ error: 'Parse job not found' });
    }

    // Get shots from database instead of memory
    const shots = await storage.getShots(parseInt(jobId), parseInt(sceneIndex));

    console.log(`GET shots - parseJobId: ${jobId}, sceneIndex: ${sceneIndex}, found ${shots.length} shots`);
    console.log('First shot sample:', shots[0]);

    res.json({ shots });
  } catch (error) {
    console.error('Error getting shots:', error);
    res.status(500).json({ error: 'Failed to get shots' });
  }
});

/**
 * GET /api/usage-stats
 * Get user API usage statistics
 */
router.get('/usage-stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.uid || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get quota information
    const userTier = (req as any).user?.tier || 'free';
    const quota = await productionQuotaManager.getUserQuota(userId, userTier);

    res.json({
      quota,
      tier: userTier,
      userId: userId
    });
  } catch (error) {
    console.error('Error getting usage statistics:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

export default router;