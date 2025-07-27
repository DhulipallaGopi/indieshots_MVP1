import { Request, Response } from 'express';
import { storage } from '../storage';
import { analyzeScriptHealth } from '../services/scriptHealthAnalyzer';

/**
 * Generate script health analysis for a script
 */
export async function generateScriptHealth(req: Request, res: Response) {
  try {
    const scriptId = parseInt(req.params.scriptId);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get the script
    const script = await storage.getScript(scriptId);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    
    // Verify ownership
    if (script.userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (!script.content) {
      return res.status(400).json({ error: 'Script has no content to analyze' });
    }
    
    // Generate health analysis using AI
    const healthReport = await analyzeScriptHealth(script.content, script.title);
    
    // Check if analysis already exists for this script
    const existingAnalysis = await storage.getScriptHealthAnalysis(scriptId);
    
    const analysisData = {
      scriptId,
      userId,
      overallScore: healthReport.healthScore.overall,
      structureScore: healthReport.healthScore.structure,
      pacingScore: healthReport.healthScore.pacing,
      characterScore: healthReport.healthScore.characterDevelopment,
      dialogueScore: healthReport.healthScore.dialogue,
      visualScore: healthReport.healthScore.visualStorytelling,
      marketabilityScore: healthReport.healthScore.marketability,
      strengths: healthReport.strengths,
      improvements: healthReport.improvements,
      genre: healthReport.genre,
      mood: healthReport.mood,
      targetAudience: healthReport.targetAudience,
      marketingTags: healthReport.marketingTags,
      oneLinePitch: healthReport.oneLinePitch,
      estimatedBudget: healthReport.estimatedBudget,
      productionComplexity: healthReport.productionComplexity,
    };
    
    let savedAnalysis;
    if (existingAnalysis) {
      // Update existing analysis
      savedAnalysis = await storage.updateScriptHealthAnalysis(scriptId, analysisData);
    } else {
      // Create new analysis
      savedAnalysis = await storage.createScriptHealthAnalysis(analysisData);
    }
    
    res.json({
      message: 'Script health analysis generated successfully',
      analysis: healthReport
    });
    
  } catch (error) {
    console.error('Error generating script health analysis:', error);
    res.status(500).json({ error: 'Failed to generate script health analysis' });
  }
}

/**
 * Get script health analysis for a script
 */
export async function getScriptHealth(req: Request, res: Response) {
  try {
    const scriptId = parseInt(req.params.scriptId);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get the script to verify ownership
    const script = await storage.getScript(scriptId);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    
    // Verify ownership
    if (script.userId !== parseInt(userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get the health analysis
    const analysis = await storage.getScriptHealthAnalysis(scriptId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'No health analysis found for this script' });
    }
    
    // Transform database result to response format
    const healthReport = {
      healthScore: {
        overall: analysis.overall_score,
        structure: analysis.structure_score,
        pacing: analysis.pacing_score,
        characterDevelopment: analysis.character_score,
        dialogue: analysis.dialogue_score,
        visualStorytelling: analysis.visual_score,
        marketability: analysis.marketability_score,
      },
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      genre: analysis.genre,
      mood: analysis.mood,
      targetAudience: analysis.target_audience,
      marketingTags: analysis.marketing_tags,
      oneLinePitch: analysis.one_line_pitch,
      estimatedBudget: analysis.estimated_budget,
      productionComplexity: analysis.production_complexity,
      lastUpdated: analysis.updated_at,
    };
    
    res.json({ analysis: healthReport });
    
  } catch (error) {
    console.error('Error getting script health analysis:', error);
    res.status(500).json({ error: 'Failed to get script health analysis' });
  }
}