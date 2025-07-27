/**
 * Helper to count pages in a document (simplified implementation)
 * @param text The script text content
 * @returns Estimated page count based on word count
 */
export function estimatePageCount(text: string): number {
  // Roughly 250 words per screenplay page as an approximation
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 250) * 10) / 10);
}

/**
 * Simple regex parser for a quick preview of screenplay scenes
 * @param scriptContent The script text content
 * @returns Array of detected scenes
 */
export function parseScriptPreview(scriptContent: string) {
  const scenes = [];
  const regex = /(INT|EXT|INT\/EXT|EXT\/INT|I\/E|E\/I)[\.\s]+([^-\n]+)[-\s]*(.+)?/g;
  let match;
  
  let sceneNumber = 1;
  while ((match = regex.exec(scriptContent)) && scenes.length < 5) {
    const sceneHeading = match[0].trim();
    const location = match[2].trim();
    const time = match[3]?.trim() || '';
    
    // Get scene description (simplified)
    const endOfScene = scriptContent.indexOf('INT', match.index + match[0].length);
    const sceneContent = endOfScene !== -1 
      ? scriptContent.substring(match.index + match[0].length, endOfScene).trim()
      : scriptContent.substring(match.index + match[0].length).trim();
    
    // Try to extract characters
    const characters = extractCharactersFromScene(sceneContent);
    
    scenes.push({
      sceneNumber,
      sceneHeading,
      location,
      time,
      characters: Array.from(characters),
      description: sceneContent.substring(0, 200) + (sceneContent.length > 200 ? '...' : '')
    });
    
    sceneNumber++;
  }
  
  return scenes;
}

/**
 * Extract characters from a screenplay
 * @param scriptContent The script text content
 * @returns Array of character names
 */
export function extractCharacters(scriptContent: string): string[] {
  const characterRegex = /^[A-Z][A-Z\s]+$/gm;
  const characters = new Set<string>();
  let match;
  
  while ((match = characterRegex.exec(scriptContent)) !== null) {
    const character = match[0].trim();
    // Filter out scene headings and other common uppercase text
    if (
      character.length > 1 && 
      !character.includes('INT') && 
      !character.includes('EXT') && 
      !character.includes('FADE') &&
      !character.includes('CUT')
    ) {
      characters.add(character);
    }
  }
  
  return Array.from(characters);
}

/**
 * Extract characters from a scene
 * @param sceneContent The scene text content
 * @returns Set of character names
 */
function extractCharactersFromScene(sceneContent: string): Set<string> {
  const characterRegex = /^[A-Z][A-Z\s]+$/gm;
  const characters = new Set<string>();
  let match;
  
  while ((match = characterRegex.exec(sceneContent)) !== null) {
    const character = match[0].trim();
    // Filter out scene headings and other common uppercase text
    if (
      character.length > 1 && 
      !character.includes('INT') && 
      !character.includes('EXT') && 
      !character.includes('FADE') &&
      !character.includes('CUT')
    ) {
      characters.add(character);
    }
  }
  
  return characters;
}

/**
 * Extract locations from a screenplay
 * @param scriptContent The script text content
 * @returns Array of locations
 */
export function extractLocations(scriptContent: string): string[] {
  const locationRegex = /(INT|EXT|INT\/EXT|EXT\/INT|I\/E|E\/I)[\.\s]+([^-\n]+)/g;
  const locations = new Set<string>();
  let match;
  
  while ((match = locationRegex.exec(scriptContent)) !== null) {
    if (match[2]) {
      locations.add(match[2].trim());
    }
  }
  
  return Array.from(locations);
}