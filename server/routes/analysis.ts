import express from 'express';
import { authMiddleware } from '../auth/jwt';
import { storage } from '../storage';
import { screenplayParser } from '../services/scriptParser';
import { shotListGenerator } from '../services/shotListGenerator';
import { ParsedScene } from '../../shared/types';

const router = express.Router();

/**
 * GET /api/analysis/scripts/:id/characters
 * Extract character list from a script
 */
router.get('/scripts/:id/characters', authMiddleware, async (req, res) => {
  try {
    const scriptId = parseInt(req.params.id);
    if (isNaN(scriptId)) {
      return res.status(400).json({ message: 'Invalid script ID' });
    }

    const script = await storage.getScript(scriptId);
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    // Check authorization
    if (!req.user || script.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to script' });
    }

    const characters = screenplayParser.extractCharacters(script.content || '');
    
    res.json({
      scriptId,
      characters,
      count: characters.length
    });
  } catch (error) {
    console.error('Error extracting characters:', error);
    res.status(500).json({ message: 'Failed to extract characters' });
  }
});

/**
 * GET /api/analysis/scripts/:id/locations
 * Extract location list from a script
 */
router.get('/scripts/:id/locations', authMiddleware, async (req, res) => {
  try {
    const scriptId = parseInt(req.params.id);
    if (isNaN(scriptId)) {
      return res.status(400).json({ message: 'Invalid script ID' });
    }

    const script = await storage.getScript(scriptId);
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    // Check authorization
    if (!req.user || script.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to script' });
    }

    const locations = screenplayParser.extractLocations(script.content || '');
    
    res.json({
      scriptId,
      locations,
      count: locations.length
    });
  } catch (error) {
    console.error('Error extracting locations:', error);
    res.status(500).json({ message: 'Failed to extract locations' });
  }
});

/**
 * POST /api/analysis/scripts/:id/shot-list
 * Generate a shot list from parsed scenes
 */
router.post('/scripts/:id/shot-list', authMiddleware, async (req, res) => {
  try {
    const scriptId = parseInt(req.params.id);
    if (isNaN(scriptId)) {
      return res.status(400).json({ message: 'Invalid script ID' });
    }

    const script = await storage.getScript(scriptId);
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    // Check authorization
    if (!req.user || script.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to script' });
    }

    // Find the latest completed parse job for this script
    const userId = req.user.id as unknown as number;
    const jobs = await storage.getUserParseJobs(userId);
    const latestJob = jobs
      .filter(job => job.scriptId === scriptId && job.status === 'completed' && job.fullParseData)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string | Date).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string | Date).getTime() : 0;
        return dateB - dateA;
      })[0];

    if (!latestJob || !latestJob.fullParseData) {
      return res.status(400).json({ message: 'No completed parse data found for this script' });
    }

    const {
      includeCloseUps = true,
      includeMediumShots = true,
      includeWideShots = true,
      includeInserts = false,
      cinematicStyle = 'standard'
    } = req.body;

    // Ensure we have valid parsed scene data
    if (!latestJob.fullParseData || !Array.isArray(latestJob.fullParseData)) {
      return res.status(400).json({ message: 'No parsed scene data available for shot list generation' });
    }

    // Generate shot list
    const shotList = shotListGenerator.generateShotList({
      scenes: latestJob.fullParseData as ParsedScene[],
      includeCloseUps,
      includeMediumShots,
      includeWideShots,
      includeInserts,
      cinematicStyle
    });

    const totalDuration = shotListGenerator.calculateTotalDuration(shotList);
    const equipmentList = shotListGenerator.generateEquipmentList(shotList);
    const shotsByScene = shotListGenerator.groupShotsByScene(shotList);

    res.json({
      scriptId,
      shotList,
      totalShots: shotList.length,
      estimatedDuration: totalDuration,
      equipmentList,
      shotsByScene,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating shot list:', error);
    res.status(500).json({ error: 'Failed to generate shot list' });
  }
});

/**
 * GET /api/analysis/scripts/:id/stats
 * Get comprehensive script statistics
 */
router.get('/scripts/:id/stats', authMiddleware, async (req, res) => {
  try {
    const scriptId = parseInt(req.params.id);
    if (isNaN(scriptId)) {
      return res.status(400).json({ message: 'Invalid script ID' });
    }

    const script = await storage.getScript(scriptId);
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    // Check authorization
    if (!req.user || script.userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized access to script' });
    }

    const content = script.content || '';
    const characters = screenplayParser.extractCharacters(content);
    const locations = screenplayParser.extractLocations(content);
    
    // Basic text statistics
    const wordCount = content.split(/\s+/).length;
    const sceneCount = (content.match(/^(INT\.|EXT\.)/gm) || []).length;
    const dialogueLines = (content.match(/^[A-Z][A-Z\s]{2,}$/gm) || []).length;
    
    res.json({
      scriptId,
      title: script.title,
      pageCount: script.pageCount,
      wordCount,
      sceneCount,
      dialogueLines,
      characterCount: characters.length,
      locationCount: locations.length,
      characters: characters.slice(0, 10), // Top 10 characters
      locations: locations.slice(0, 10), // Top 10 locations
      fileSize: script.fileSize,
      createdAt: script.createdAt
    });
  } catch (error) {
    console.error('Error generating script stats:', error);
    res.status(500).json({ error: 'Failed to generate script statistics' });
  }
});

export default router;