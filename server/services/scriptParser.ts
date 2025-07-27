import OpenAI from "openai";
import { estimatePageCount } from "../utils/scriptUtils";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable must be set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedScene {
  sceneNumber?: number;
  sceneHeading?: string;
  location?: string;
  timeOfDay?: string;
  intExt?: 'INT' | 'EXT';
  characters?: string[];
  dialogue?: string;
  action?: string;
  props?: string[];
  wardrobe?: string[];
  makeup?: string[];
  specialEffects?: string[];
  cameraMovement?: string;
  shotSize?: string;
  tone?: string;
  notes?: string;
}

export interface ParseOptions {
  content: string;
  selectedColumns: string[];
  maxPages?: number;
  isPremium?: boolean;
}

/**
 * Advanced screenplay parser using GPT-4 for comprehensive scene analysis
 */
export class ScreenplayParser {
  
  /**
   * Parse screenplay content into structured scene data
   */
  async parseScript(options: ParseOptions): Promise<ParsedScene[]> {
    const { content, selectedColumns, maxPages = 5, isPremium = false } = options;
    
    // Estimate page count and apply limits
    const estimatedPages = estimatePageCount(content);
    const pagesToProcess = isPremium ? estimatedPages : Math.min(estimatedPages, maxPages);
    
    // Truncate content based on page limit
    const wordsPerPage = 250;
    const maxWords = pagesToProcess * wordsPerPage;
    const words = content.split(/\s+/);
    const limitedContent = words.slice(0, maxWords).join(' ');
    
    const systemPrompt = this.buildSystemPrompt(selectedColumns);
    const userPrompt = this.buildUserPrompt(limitedContent, selectedColumns);
    
    try {
      console.log('Making OpenAI request for script parsing...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 4000,
      });

      console.log('OpenAI response received, parsing result...');
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      console.log('Raw OpenAI response:', content);
      const result = JSON.parse(content);
      console.log('Parsed JSON result:', JSON.stringify(result, null, 2));
      
      const scenes = this.validateAndCleanScenes(result.scenes || [], selectedColumns);
      console.log(`Successfully parsed ${scenes.length} scenes`);
      
      return scenes;
      
    } catch (error: any) {
      console.error('OpenAI parsing error:', error);
      if (error.message?.includes('timeout')) {
        throw new Error('AI parsing timed out - please try again');
      } else if (error.message?.includes('API key')) {
        throw new Error('Invalid API key - please check OpenAI configuration');
      } else {
        throw new Error(`Failed to parse screenplay: ${error.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate a quick preview parse using regex for free users
   */
  async previewParse(content: string): Promise<ParsedScene[]> {
    const scenes: ParsedScene[] = [];
    
    // Split content into potential scenes
    const sceneBreaks = content.split(/(?=^(INT\.|EXT\.))/gm);
    
    sceneBreaks.forEach((sceneText, index) => {
      if (sceneText.trim().length < 10) return;
      
      const scene: ParsedScene = {
        sceneNumber: index + 1,
      };
      
      // Extract scene heading
      const headingMatch = sceneText.match(/^(INT\.|EXT\.)\s*([^-\n]+)(?:\s*-\s*([^-\n]+))?/);
      if (headingMatch) {
        scene.sceneHeading = headingMatch[0].trim();
        scene.intExt = headingMatch[1] === 'INT.' ? 'INT' : 'EXT';
        scene.location = headingMatch[2]?.trim();
        scene.timeOfDay = headingMatch[3]?.trim();
      }
      
      // Extract characters (simple approach)
      const characterMatches = sceneText.match(/^[A-Z][A-Z\s]{2,}$/gm);
      if (characterMatches) {
        const characterSet = new Set<string>();
        characterMatches.forEach(c => characterSet.add(c.trim()));
        scene.characters = Array.from(characterSet);
      }
      
      // Extract action (everything that's not dialogue or character names)
      const actionLines = sceneText
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.match(/^(INT\.|EXT\.)/) &&
                 !trimmed.match(/^[A-Z][A-Z\s]{2,}$/) &&
                 !trimmed.match(/^\([^)]+\)$/);
        });
      
      if (actionLines.length > 0) {
        scene.action = actionLines.join(' ').trim();
      }
      
      scenes.push(scene);
    });
    
    return scenes.slice(0, 3); // Limit preview to 3 scenes
  }

  /**
   * Build system prompt for GPT-4 based on selected columns
   */
  private buildSystemPrompt(selectedColumns: string[]): string {
    const basePrompt = `You are an expert screenplay analyst. Your task is to analyze any text content and convert it into screenplay scenes with structured data.

IMPORTANT: Whether the content is in proper screenplay format OR narrative prose, you must:
1. Break the content into logical scenes based on location changes, time shifts, or narrative beats
2. Convert narrative descriptions into action lines 
3. Create appropriate scene headings (INT./EXT. LOCATION - TIME)
4. Extract or infer characters, locations, and other elements
5. ALWAYS return at least 1 scene, even if converting narrative text

Analyze the content and return a JSON object with a "scenes" array. Each scene object should contain the following fields:`;

    const columnDescriptions = {
      sceneNumber: "sceneNumber: Sequential number of the scene",
      sceneHeading: "sceneHeading: Complete scene heading (e.g., 'INT. COFFEE SHOP - DAY')",
      location: "location: Specific location name (e.g., 'COFFEE SHOP', 'BEDROOM')",
      timeOfDay: "timeOfDay: Time indication (e.g., 'DAY', 'NIGHT', 'MORNING')",
      intExt: "intExt: Either 'INT' for interior or 'EXT' for exterior",
      characters: "characters: Array of character names present in the scene",
      dialogue: "dialogue: Key dialogue or dialogue summary for the scene",
      action: "action: Action description and stage directions",
      props: "props: Array of specific props mentioned in the scene",
      wardrobe: "wardrobe: Array of clothing or wardrobe items mentioned",
      makeup: "makeup: Array of makeup or special appearance requirements",
      specialEffects: "specialEffects: Array of special effects needed",
      cameraMovement: "cameraMovement: Camera movements described or implied",
      shotSize: "shotSize: Shot sizes mentioned or implied (close-up, wide shot, etc.)",
      tone: "tone: Emotional tone or mood of the scene",
      notes: "notes: Additional production notes or observations"
    };

    const selectedDescriptions = selectedColumns
      .map(col => columnDescriptions[col as keyof typeof columnDescriptions])
      .filter(Boolean)
      .join('\n- ');

    return `${basePrompt}

- ${selectedDescriptions}

Return valid JSON only. Be precise and extract only information explicitly present in the screenplay.`;
  }

  /**
   * Build user prompt with screenplay content
   */
  private buildUserPrompt(content: string, selectedColumns: string[]): string {
    return `Please analyze this screenplay and extract the requested information for each scene. Focus on the following columns: ${selectedColumns.join(', ')}.

Screenplay content:
${content}

Return the analysis as a JSON object with a "scenes" array containing the extracted data.`;
  }

  /**
   * Validate and clean parsed scenes
   */
  private validateAndCleanScenes(scenes: any[], selectedColumns: string[]): ParsedScene[] {
    return scenes.map((scene, index) => {
      const cleanScene: ParsedScene = {
        sceneNumber: scene.sceneNumber || index + 1,
      };

      // Only include selected columns
      selectedColumns.forEach(column => {
        if (scene[column] !== undefined) {
          cleanScene[column as keyof ParsedScene] = scene[column];
        }
      });

      return cleanScene;
    });
  }

  /**
   * Extract character list from entire screenplay
   */
  extractCharacters(content: string): string[] {
    const characterMatches = content.match(/^[A-Z][A-Z\s]{2,}$/gm);
    if (!characterMatches) return [];
    
    const characterSet = new Set<string>();
    characterMatches.forEach(c => characterSet.add(c.trim()));
    const characters = Array.from(characterSet)
      .filter(name => 
        name.length > 2 && 
        name.length < 30 &&
        !name.match(/^(INT\.|EXT\.|FADE|CUT|DISSOLVE)/)
      );
    
    return characters.slice(0, 20); // Limit to top 20 characters
  }

  /**
   * Extract locations from screenplay
   */
  extractLocations(content: string): string[] {
    const locationMatches = content.match(/^(INT\.|EXT\.)\s*([^-\n]+)/gm);
    if (!locationMatches) return [];
    
    const locationSet = new Set(locationMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts.slice(1).join(' ').split('-')[0].trim();
    }));
    const locations = Array.from(locationSet);
    
    return locations.slice(0, 15); // Limit to top 15 locations
  }
}

export const screenplayParser = new ScreenplayParser();