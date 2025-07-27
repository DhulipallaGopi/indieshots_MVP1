import { Request, Response } from 'express';
import { storage } from '../storage';
import { screenplayParser } from '../services/scriptParser';
import { z } from 'zod';
import { insertParseJobSchema } from '../../shared/schema';
import XLSX from 'xlsx';

/**
 * Create a new parse job
 */
export async function createParseJob(req: Request, res: Response) {
  try {
    const { scriptId, selectedColumns } = req.body;
    
    // Get authenticated user ID from request
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate input - userId is now a string from Firebase
    const columnsArray: string[] = Array.isArray(selectedColumns) ? selectedColumns : [];
    const jobData = {
      scriptId: parseInt(scriptId),
      userId: userId, // Keep as string for Firebase compatibility
      selectedColumns: columnsArray,
      status: 'pending' as const
    };

    // Get the script and verify ownership
    const script = await storage.getScript(jobData.scriptId);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    
    // Verify user owns the script (Firebase user IDs are strings)
    if (script.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Create the parse job
    const parseJob = await storage.createParseJob(jobData);

    // Don't auto-start parsing in upload, let user trigger it manually

    res.status(201).json(parseJob);
  } catch (error) {
    console.error('Error creating parse job:', error);
    res.status(500).json({ error: 'Failed to create parse job' });
  }
}

/**
 * Start parsing a job manually
 */
export async function startParseJob(req: Request, res: Response) {
  try {
    const jobId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const job = await storage.getParseJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Parse job not found' });
    }
    
    // Verify ownership (Firebase user IDs are strings)
    if (job.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ error: 'Job is not in pending status' });
    }

    // Get the script
    const script = await storage.getScript(job.scriptId);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }

    // Start parsing immediately
    setImmediate(async () => {
      try {
        console.log(`Starting parse job ${jobId} for script "${script.title}"`);
        await storage.updateParseJob(jobId, { status: 'processing' });
        
        const isPremium = false; // Demo user is free tier
        const selectedColumns = job.selectedColumns || ['sceneHeading', 'location', 'characters', 'action'];
        
        // Use scene_divider logic to extract scenes from script
        const { extractScenesFromText } = await import('../services/sceneProcessor');
        const extractedScenes = await extractScenesFromText(script.content || '');

        console.log(`Parse job ${jobId} completed with ${extractedScenes.length} scenes`);
        await storage.updateParseJob(jobId, {
          status: 'completed',
          fullParseData: { scenes: extractedScenes }
        });
      } catch (error) {
        console.error('Parse job failed:', error);
        await storage.updateParseJob(jobId, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    res.json({ message: 'Parse job started', jobId });
  } catch (error) {
    console.error('Error starting parse job:', error);
    res.status(500).json({ error: 'Failed to start parse job' });
  }
}

/**
 * Get all parse jobs for a user
 */
export async function getParseJobs(req: Request, res: Response) {
  try {
    // Get authenticated user ID from request
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const jobs = await storage.getUserParseJobs(userId);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching parse jobs:', error);
    res.status(500).json({ error: 'Failed to fetch parse jobs' });
  }
}

/**
 * Get a specific parse job
 */
export async function getParseJob(req: Request, res: Response) {
  try {
    const jobId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const job = await storage.getParseJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Parse job not found' });
    }
    
    // Verify ownership (Firebase user IDs are strings)
    if (job.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching parse job:', error);
    res.status(500).json({ error: 'Failed to fetch parse job' });
  }
}

/**
 * Update parse job columns
 */
export async function updateParseJobColumns(req: Request, res: Response) {
  try {
    const jobId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    const { columns } = req.body;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Invalid columns data' });
    }

    const job = await storage.getParseJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Parse job not found' });
    }
    
    // Verify ownership (Firebase user IDs are strings)
    if (job.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update the selected columns
    const updatedJob = await storage.updateParseJob(jobId, {
      selectedColumns: columns
    });

    res.json(updatedJob);
  } catch (error) {
    console.error('Error updating parse job columns:', error);
    res.status(500).json({ error: 'Failed to update columns' });
  }
}

/**
 * Download parse job results as CSV file
 */
export async function downloadJobResults(req: Request, res: Response) {
  try {
    const jobId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const job = await storage.getParseJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Parse job not found' });
    }
    
    // Verify ownership (Firebase user IDs are strings)
    if (job.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (job.status !== 'completed' || !job.fullParseData) {
      return res.status(400).json({ error: 'Parse job is not completed or has no data' });
    }

    // Get the script for filename
    const script = await storage.getScript(job.scriptId);
    const filename = `${script?.title || 'script'}_shot_list.csv`;

    // Get shot data from database instead of scene data
    const allShots = [];
    
    // Handle fullParseData which might already be an object or a string
    let parsedData;
    if (typeof job.fullParseData === 'string') {
      try {
        parsedData = JSON.parse(job.fullParseData);
      } catch (error) {
        console.error('Error parsing fullParseData:', error);
        return res.status(400).json({ error: 'Invalid parse data format' });
      }
    } else {
      parsedData = job.fullParseData;
    }
    
    const scenes = parsedData?.scenes || [];
    
    // Collect all shots from all scenes for this job
    for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
      const sceneShots = await storage.getShots(jobId, sceneIndex);
      allShots.push(...sceneShots);
    }
    
    if (allShots.length === 0) {
      // If no shots exist, export the scene data instead
      console.log('No shots found, exporting scene data instead');
      
      const csvData = scenes.map((scene: any, index: number) => ({
        SceneNumber: scene.sceneNumber || index + 1,
        SceneHeading: scene.sceneHeading || '',
        Location: scene.location || '',
        TimeOfDay: scene.timeOfDay || '',
        Characters: Array.isArray(scene.characters) ? scene.characters.join('; ') : (scene.characters || ''),
        Action: scene.action || '',
        Dialogue: scene.dialogue || '',
        Props: Array.isArray(scene.props) ? scene.props.join('; ') : (scene.props || ''),
        Tone: scene.tone || '',
        Notes: scene.notes || ''
      }));

      if (csvData.length === 0) {
        return res.status(400).json({ error: 'No scene data available for export' });
      }

      // Generate CSV from scene data
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map((row: any) => 
          headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
      return;
    }

    // Always use ALL available columns for comprehensive export
    const selectedColumns = [
      'sceneNumber', 'sceneHeading', 'shotNumber', 'shotDescription', 'shotType', 
      'lens', 'movement', 'location', 'timeOfDay', 'characters', 'action', 'dialogue',
      'props', 'tone', 'moodAndAmbience', 'lighting', 'notes', 'soundDesign', 'colourTemp'
    ];
    
    console.log('=== CSV EXPORT DEBUG ===');
    console.log('Raw selectedColumns from job:', job.selectedColumns);
    console.log('Type of selectedColumns:', typeof job.selectedColumns);
    console.log('Is Array:', Array.isArray(job.selectedColumns));
    console.log('Selected columns for CSV export:', selectedColumns);
    console.log('Number of selected columns:', selectedColumns.length);
    console.log('Total shots found:', allShots.length);
    
    // Map database field names to display names
    // Map frontend column names to actual database column names
    const fieldMap: Record<string, string> = {
      'sceneNumber': 'sceneIndex',
      'sceneHeading': 'sceneHeading', 
      'shotNumber': 'shotNumberInScene',
      'shotDescription': 'shotDescription',
      'shotType': 'shotType',
      'location': 'location',
      'timeOfDay': 'timeOfDay',
      'lens': 'lens',
      'movement': 'movement',
      'moodAndAmbience': 'moodAndAmbience',
      'lighting': 'lighting',
      'props': 'props',
      'notes': 'notes',
      'soundDesign': 'soundDesign',
      'colourTemp': 'colourTemp',
      'characters': 'characters',
      'tone': 'tone',
      'action': 'action',
      'dialogue': 'dialogue'
    };

    // Create proper CSV headers with display names
    const displayNames: Record<string, string> = {
      'sceneNumber': 'Scene Number',
      'sceneHeading': 'Scene Heading', 
      'shotNumber': 'Shot Number',
      'shotDescription': 'Shot Description',
      'shotType': 'Shot Type',
      'location': 'Location',
      'timeOfDay': 'Time of Day',
      'lens': 'Lens',
      'movement': 'Movement',
      'moodAndAmbience': 'Mood & Ambience',
      'lighting': 'Lighting',
      'props': 'Props',
      'notes': 'Notes',
      'soundDesign': 'Sound Design',
      'colourTemp': 'Color Temperature',
      'characters': 'Characters',
      'tone': 'Tone',
      'action': 'Action',
      'dialogue': 'Dialogue'
    };

    const csvHeaders = selectedColumns.map(col => displayNames[col] || col);
    console.log('CSV Headers:', csvHeaders);
    
    // Create CSV content
    const csvRows = [];
    csvRows.push(csvHeaders.join(','));
    
    allShots.forEach((shot, shotIndex) => {
      const row = selectedColumns.map(columnName => {
        const dbField = fieldMap[columnName] || columnName;
        let value = shot[dbField as keyof typeof shot];
        
        // Handle special cases
        if (columnName === 'sceneNumber') {
          value = (shot.sceneIndex || 0) + 1;
        }
        if (columnName === 'shotNumber') {
          value = shot.shotNumberInScene;
        }
        
        // Debug logging for first shot
        if (shotIndex === 0) {
          console.log(`Column: ${columnName}, DB Field: ${dbField}, Value: ${value}`);
        }
        
        // Ensure proper CSV formatting - always quote values that contain commas, quotes, or newlines
        let formattedValue = String(value || '');
        if (formattedValue.includes(',') || formattedValue.includes('"') || formattedValue.includes('\n') || formattedValue.includes('\r')) {
          // Escape quotes by doubling them
          formattedValue = formattedValue.replace(/"/g, '""');
          // Wrap in quotes
          formattedValue = `"${formattedValue}"`;
        }
        
        return formattedValue;
      });
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    console.log('Final CSV Content Preview (first 500 chars):', csvContent.substring(0, 500));
    
    // Set headers for CSV download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv');
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error downloading job results:', error);
    res.status(500).json({ error: 'Failed to download results' });
  }
}