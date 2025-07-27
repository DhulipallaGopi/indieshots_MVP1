import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
// Use existing file processor for PDF parsing
import { extractTextFromFile } from '../services/fileProcessor';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SceneData {
  sceneNumber: number;
  sceneHeading: string;
  rawTextContent: string;
}

export interface ProcessedScene extends SceneData {
  id: string;
  location?: string;
  timeOfDay?: string;
}

/**
 * Clean text by removing unwanted characters and numbers
 */
function cleanText(text: string): string {
  // Remove standalone numbers
  text = text.replace(/\b\d+\b/g, '');
  // Remove non-printable ASCII characters except spaces
  text = text.replace(/[^\x20-\x7E]/g, ' ');
  return text.trim();
}

/**
 * Extract scenes from text content using regex pattern matching
 */
export async function extractScenesFromText(textContent: string): Promise<ProcessedScene[]> {
  try {
    const combinedText = textContent;

    // Scene regex pattern for INT./EXT. scene headings - improved to handle multiple scenes
    const sceneRegex = /(?:^|\n)((?:INT\.|EXT\.)[^\n]+(?:\n(?!(?:INT\.|EXT\.))[^\n]*)*)/g;
    const matches = Array.from(combinedText.matchAll(sceneRegex));

    const scenes: ProcessedScene[] = [];
    
    for (let idx = 0; idx < matches.length; idx++) {
      const match = matches[idx];
      const fullSceneText = match[1] || match[0];
      
      const cleanedLines = fullSceneText
        .split('\n')
        .map((line: string) => cleanText(line))
        .filter((line: string) => line.length > 0);
      
      const cleanedContent = cleanedLines.join('\n');
      
      if (!cleanedContent) continue;

      const sceneHeading = cleanedLines.find((line: string) => line.trim()) || `Scene ${idx + 1}`;
      const { location, timeOfDay } = extractSceneHeadingInfo(sceneHeading);

      scenes.push({
        id: `scene_${idx + 1}`,
        sceneNumber: idx + 1,
        sceneHeading,
        rawTextContent: cleanedContent,
        location,
        timeOfDay
      });
    }

    return scenes;
  } catch (error) {
    console.error('Error extracting scenes from text:', error);
    throw new Error('Failed to extract scenes from text');
  }
}

/**
 * Extract location and time of day from scene heading
 */
function extractSceneHeadingInfo(sceneHeading: string): { location: string; timeOfDay: string } {
  const firstLine = sceneHeading.trim().split('\n')[0].toUpperCase();
  const timeKeywords = ['DAY', 'NIGHT', 'EVENING', 'MORNING', 'AFTERNOON', 'DAWN', 'DUSK'];
  
  let location = "Unspecified Location";
  let timeOfDay = "Unspecified";

  const parts = firstLine.replace("EXT.", "").replace("INT.", "").trim().split(/\s+/);
  
  for (const word of parts) {
    if (timeKeywords.includes(word)) {
      timeOfDay = word;
    } else if (location === "Unspecified Location" && word.length > 2) {
      location = word;
    }
  }

  return { 
    location: location.charAt(0) + location.slice(1).toLowerCase(), 
    timeOfDay: timeOfDay.charAt(0) + timeOfDay.slice(1).toLowerCase() 
  };
}