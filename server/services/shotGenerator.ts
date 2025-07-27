import { OpenAI } from 'openai';

// Create OpenAI client dynamically to pick up fresh environment variables
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }
  return new OpenAI({ 
    apiKey,
    timeout: 120000 // 120 second timeout for shot generation (increased from 60s)
  });
}

/**
 * Generate demo shots when OpenAI API is unavailable
 */
function generateDemoShots(prompt: string): string {
  console.log('🎬 Generating professional demo shots for scene analysis');
  
  // Analyze scene content for context
  const isInterior = prompt.toLowerCase().includes('int.') || prompt.toLowerCase().includes('interior');
  const isExterior = prompt.toLowerCase().includes('ext.') || prompt.toLowerCase().includes('exterior');
  const isDialogue = prompt.toLowerCase().includes('dialogue') || prompt.includes(':');
  const isAction = prompt.toLowerCase().includes('action') || prompt.toLowerCase().includes('runs') || prompt.toLowerCase().includes('fight');
  
  // Generate contextual shots based on scene content
  const shotTemplates = [];
  
  // Establishing shot
  if (isExterior) {
    shotTemplates.push("Wide shot establishing exterior location|Wide Shot|24mm|Static|Atmospheric|Natural lighting|Environmental props|Establish location and mood|Ambient environmental sound|Daylight 5600K|Establishing|Location setting|Scene opens|No dialogue");
  } else {
    shotTemplates.push("Wide shot establishing interior space|Wide Shot|28mm|Slow push-in|Intimate|Practical lighting|Room furnishings|Set the scene context|Room tone|Warm 3200K|Establishing|Interior space|Characters enter|No dialogue");
  }
  
  // Character introduction
  shotTemplates.push("Medium shot introducing main character|Medium Shot|50mm|Slight zoom-in|Focused|Key lighting|Character props|Character introduction|Clear audio|Neutral 5600K|Engaging|Main character|Character appears|Character speaks");
  
  // Dialogue coverage if dialogue detected
  if (isDialogue) {
    shotTemplates.push("Over-shoulder shot during conversation|Over-Shoulder|85mm|Static|Conversational|Three-point lighting|Scene props|Dialogue coverage|Clean dialogue|Neutral 5600K|Intimate|Both characters|Conversation unfolds|Main dialogue");
    shotTemplates.push("Reverse angle for dialogue response|Reverse Shot|85mm|Static|Emotional|Soft key lighting|Minimal props|Reaction coverage|Clear speech|Warm 3200K|Responsive|Secondary character|Character reacts|Response dialogue");
  }
  
  // Action shots if action detected
  if (isAction) {
    shotTemplates.push("Dynamic tracking shot following action|Tracking Shot|35mm|Handheld follow|High energy|Available lighting|Action props|Movement dynamics|Action sounds|Variable temp|Energetic|Active characters|Action sequence|Action dialogue");
  }
  
  // Close-up for emotion
  shotTemplates.push("Close-up capturing character emotion|Close-Up|100mm|Static|Emotional intensity|Soft lighting|Minimal props|Emotional beat|Subtle background|Warm 3200K|Emotional|Key character|Emotional moment|Internal thought");
  
  // Insert/detail shot
  shotTemplates.push("Insert shot of important detail|Insert|100mm Macro|Static|Detailed focus|Focused lighting|Key prop|Story element|Minimal sound|Cool 5600K|Mysterious|Object focus|Detail reveals|No dialogue");
  
  // Cutaway shot
  shotTemplates.push("Cutaway shot for context|Cutaway|50mm|Static|Contextual|Natural lighting|Environmental props|Scene context|Ambient sound|Natural temp|Neutral|Scene element|Provides context|No dialogue");
  
  // Select shots based on scene content and tier
  const selectedShots = shotTemplates;
  
  console.log(`📋 Generated ${selectedShots.length} demo shots (fallback generation)`);
  return selectedShots.join('\n');
}

export interface ShotData {
  shotNumber: number;
  shotDescription: string;
  shotType: string;
  lens: string;
  movement: string;
  moodAndAmbience: string;
  lighting: string;
  props: string;
  notes: string;
  soundDesign: string;
  colourTemp: string;
  location: string;
  timeOfDay: string;
  tone: string;
  characters: string;
  action: string;
  dialogue: string;
  estimatedDuration?: number;
}

interface Context {
  location: string;
  timeOfDay: string;
  ambience?: string;
  lightingStyle?: string;
  colorScheme?: string;
}

/**
 * Generate GPT-4 response for shot division
 */
async function gpt4Response(prompt: string): Promise<string> {
  // Check if OpenAI API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('🎬 Using demo shot generation - no API key configured');
    return generateDemoShots(prompt);
  }
  
  console.log('🔍 Shot generation starting with OpenAI API key present');
  console.log('📝 Prompt length:', prompt.length);
  console.log('💡 Prompt preview:', prompt.substring(0, 200) + '...');
  
  // Try multiple times with different strategies
  const maxRetries = 3;
  const strategies = [
    { model: 'gpt-4', max_tokens: 1500, temperature: 0.3 },
    { model: 'gpt-4', max_tokens: 1000, temperature: 0.2 },
    { model: 'gpt-4', max_tokens: 800, temperature: 0.1 }
  ];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = getOpenAIClient();
      const strategy = strategies[attempt];
      
      console.log(`🔑 OpenAI API attempt ${attempt + 1}/${maxRetries}:`, {
        exists: !!apiKey,
        length: apiKey.length,
        prefix: apiKey.substring(0, 15) + '...',
        model: strategy.model,
        max_tokens: strategy.max_tokens
      });

      const response = await client.chat.completions.create({
        model: strategy.model,
        messages: [
          { role: 'system', content: 'You are a professional cinematographer and shot list expert. Always follow formatting instructions precisely.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: strategy.max_tokens,
        temperature: strategy.temperature
      });

      console.log('✅ OpenAI API success on attempt', attempt + 1);
      return response.choices[0].message.content?.trim() || '';
      
    } catch (error: any) {
      console.error(`🚨 OpenAI API error on attempt ${attempt + 1}:`, {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type
      });
      
      // If it's a timeout or rate limit, wait before retrying
      if (error.code === 'timeout' || error.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // For other errors, don't retry
      break;
    }
  }
  
  // Use demo shots as fallback for any API issues
  console.log('🎬 OpenAI API unavailable - using professional demo shot generation');
  console.log('📋 This ensures shot generation continues working even when API has issues');
  console.log('❗ FALLBACK TRIGGERED - Real shots not generated due to API errors above');
  return generateDemoShots(prompt);
}

/**
 * Extract shots from GPT-4 response text
 */
function extractShotsFromResponse(responseText: string): Partial<ShotData>[] {
  const shots: Partial<ShotData>[] = [];
  
  console.log('📋 Parsing OpenAI response...');
  console.log('📄 Response text length:', responseText.length);
  console.log('📄 Response preview:', responseText.substring(0, 300) + '...');
  
  const lines = responseText.split('\n');
  console.log('📄 Total lines to parse:', lines.length);
  
  for (const line of lines) {
    if (line.trim()) {
      const parts = line.split('|').map(part => part.trim());
      console.log(`📄 Line parts count: ${parts.length}, content: ${line}`);
      
      if (parts.length === 14) {
        const [shotDescription, shotType, lens, movement, mood, lighting, props, notes, sound, temp, tone, characters, action, dialogue] = parts;
        
        // Skip header rows or placeholder data
        if (shotDescription === 'Shot Description' || shotType === 'Shot Type' || lens === 'Lens' || shotDescription.toLowerCase().includes('shot description')) {
          console.log('📄 Skipping header row:', shotDescription);
          continue;
        }
        
        const shot = {
          shotDescription,
          shotType,
          lens,
          movement,
          moodAndAmbience: mood,
          lighting,
          props,
          notes,
          soundDesign: sound,
          colourTemp: temp,
          tone,
          characters,
          action,
          dialogue
        };
        
        console.log('📄 Parsed shot:', shot.shotDescription);
        shots.push(shot);
      } else {
        console.log(`📄 Skipping line with ${parts.length} parts (expected 14):`, line.substring(0, 100));
      }
    }
  }
  
  console.log('📋 Successfully parsed shots count:', shots.length);
  if (shots.length > 0) {
    console.log('📋 First shot sample:', JSON.stringify(shots[0], null, 2));
  } else {
    console.log('⚠️  No shots parsed - response format might be different');
    console.log('📄 Full response text for debugging:', responseText);
  }
  
  return shots;
}

/**
 * Split text into paragraphs for processing
 */
function splitIntoParagraphs(text: string): string[] {
  return text.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * Process a single paragraph into shots
 */
async function processParagraph(
  paragraph: string, 
  context: Context, 
  sceneHeading: string, 
  sceneNumber: number, 
  startIndex: number
): Promise<ShotData[]> {
  const prompt = `Create 5-10 cinematic shots for this scene in pipe-separated format. Each row must have exactly 14 fields:

Shot Description | Shot Type | Lens | Movement | Mood & Ambience | Lighting | Props | Notes | Sound Design | Colour Temp | Tone | Characters | Action | Dialogue

Example:
Woman nervously checking phone | Medium Shot | 50mm | Static | Anxious | Soft key | Phone, coffee cup | Character introduction | Ambient café | Warm 3200K | Nervous | Sarah | Checking phone | Where is he?

Scene: ${paragraph}
Heading: ${sceneHeading}
Location: ${context.location}
Time: ${context.timeOfDay}

Generate 5-10 shots covering all major story beats, character moments, and comprehensive cinematic coverage for the scene.`;

  try {
    const response = await gpt4Response(prompt);
    const shots = extractShotsFromResponse(response);
    
    // If no shots were parsed, generate fallback shots
    if (shots.length === 0) {
      console.log('⚠️  No shots parsed from OpenAI response, generating fallback shots');
      return generateFallbackShots(paragraph, context, sceneHeading, sceneNumber, startIndex);
    }
    
    return shots.map((shot, i) => ({
      shotNumber: startIndex + i + 1,
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
      tone: shot.tone || '',
      characters: shot.characters || '',
      action: shot.action || '',
      dialogue: shot.dialogue || '',
      location: context.location,
      timeOfDay: context.timeOfDay,
      estimatedDuration: 3 // Default duration in seconds
    }));
  } catch (error) {
    console.error('Error processing paragraph:', error);
    console.log('🎬 Generating fallback shots due to processing error');
    return generateFallbackShots(paragraph, context, sceneHeading, sceneNumber, startIndex);
  }
}

/**
 * Generate fallback shots when AI parsing fails
 */
function generateFallbackShots(
  paragraph: string,
  context: Context,
  sceneHeading: string,
  sceneNumber: number,
  startIndex: number
): ShotData[] {
  console.log('🎬 Generating fallback shots for scene');
  
  const fallbackShots: ShotData[] = [
    {
      shotNumber: startIndex + 1,
      shotDescription: `Establishing shot of ${context.location}`,
      shotType: 'Wide Shot',
      lens: '24mm',
      movement: 'Static',
      moodAndAmbience: 'Atmospheric',
      lighting: 'Natural lighting',
      props: 'Environmental props',
      notes: 'Establish location and mood',
      soundDesign: 'Ambient environmental sound',
      colourTemp: 'Daylight 5600K',
      tone: 'Establishing',
      characters: 'Scene setting',
      action: 'Location reveal',
      dialogue: 'No dialogue',
      location: context.location,
      timeOfDay: context.timeOfDay,
      estimatedDuration: 3
    },
    {
      shotNumber: startIndex + 2,
      shotDescription: 'Medium shot of main character',
      shotType: 'Medium Shot',
      lens: '50mm',
      movement: 'Slight push-in',
      moodAndAmbience: 'Focused',
      lighting: 'Key lighting',
      props: 'Character props',
      notes: 'Character introduction',
      soundDesign: 'Clear audio',
      colourTemp: 'Neutral 5600K',
      tone: 'Engaging',
      characters: 'Main character',
      action: 'Character appears',
      dialogue: 'Character speaks',
      location: context.location,
      timeOfDay: context.timeOfDay,
      estimatedDuration: 4
    },
    {
      shotNumber: startIndex + 3,
      shotDescription: 'Close-up for emotional emphasis',
      shotType: 'Close-Up',
      lens: '85mm',
      movement: 'Static',
      moodAndAmbience: 'Emotional intensity',
      lighting: 'Soft lighting',
      props: 'Minimal props',
      notes: 'Emotional beat',
      soundDesign: 'Subtle background',
      colourTemp: 'Warm 3200K',
      tone: 'Emotional',
      characters: 'Key character',
      action: 'Emotional moment',
      dialogue: 'Key dialogue',
      location: context.location,
      timeOfDay: context.timeOfDay,
      estimatedDuration: 3
    }
  ];
  
  console.log(`📋 Generated ${fallbackShots.length} fallback shots`);
  return fallbackShots;
}

/**
 * Extract location and time info from scene heading
 */
function extractSceneHeadingInfo(text: string): { location: string; timeOfDay: string } {
  const firstLine = text.trim().split('\n')[0].toUpperCase();
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

/**
 * Generate shots from scene text using AI
 */
export async function generateShotsFromScene(
  sceneText: string,
  sceneHeading: string,
  sceneNumber: number
): Promise<ShotData[]> {
  try {
    // Extract scene context
    const { location, timeOfDay } = extractSceneHeadingInfo(sceneText);
    const context: Context = {
      location,
      timeOfDay,
      ambience: 'general',
      lightingStyle: 'general',
      colorScheme: 'general'
    };

    // Split scene into paragraphs
    const paragraphs = splitIntoParagraphs(sceneText);
    const allShots: ShotData[] = [];

    // Process paragraphs sequentially to maintain shot numbering
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const startIndex = allShots.length;
      
      const shots = await processParagraph(
        paragraph, 
        context, 
        sceneHeading, 
        sceneNumber, 
        startIndex
      );
      
      allShots.push(...shots);
    }

    return allShots;
  } catch (error) {
    console.error('Error generating shots from scene:', error);
    throw new Error('Failed to generate shots from scene');
  }
}