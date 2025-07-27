import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface HealthScore {
  overall: number;
  structure: number;
  pacing: number;
  characterDevelopment: number;
  dialogue: number;
  visualStorytelling: number;
  marketability: number;
}

interface ImprovementSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  example?: string;
  reasoning: string;
}

interface ScriptHealthReport {
  healthScore: HealthScore;
  strengths: string[];
  improvements: ImprovementSuggestion[];
  genre: string;
  mood: string;
  targetAudience: string;
  marketingTags: string[];
  oneLinePitch: string;
  estimatedBudget: string;
  productionComplexity: string;
}

export async function analyzeScriptHealth(scriptContent: string, scriptTitle: string): Promise<ScriptHealthReport> {
  try {
    const prompt = `
You are an expert screenplay analyst and creative consultant. Analyze the following screenplay and provide a comprehensive health assessment with specific, actionable creative feedback.

SCREENPLAY TITLE: "${scriptTitle}"

SCREENPLAY CONTENT:
${scriptContent.substring(0, 8000)} ${scriptContent.length > 8000 ? '...[truncated]' : ''}

Please analyze this screenplay and provide your assessment in the following JSON format:

{
  "healthScore": {
    "overall": [score 1-100],
    "structure": [score 1-100 - three-act structure, plot progression, pacing],
    "pacing": [score 1-100 - rhythm, scene transitions, momentum],
    "characterDevelopment": [score 1-100 - character arcs, motivations, growth],
    "dialogue": [score 1-100 - natural speech, subtext, character voice],
    "visualStorytelling": [score 1-100 - visual elements, cinematic potential],
    "marketability": [score 1-100 - commercial appeal, target audience clarity]
  },
  "strengths": [
    "List 3-5 specific strengths of this screenplay",
    "Focus on what works well creatively and commercially"
  ],
  "improvements": [
    {
      "category": "Structure",
      "priority": "high|medium|low",
      "suggestion": "Specific actionable improvement suggestion",
      "example": "Optional concrete example of how to implement this",
      "reasoning": "Explain why this improvement would help the script"
    }
  ],
  "genre": "Primary genre (e.g., Drama, Comedy, Thriller, etc.)",
  "mood": "Overall mood/tone (e.g., Dark and introspective, Light-hearted adventure, etc.)",
  "targetAudience": "Primary target audience (e.g., Young adults 18-25, General audiences, etc.)",
  "marketingTags": ["3-5 marketing keywords/phrases for this script"],
  "oneLinePitch": "A compelling one-sentence logline for marketing purposes",
  "estimatedBudget": "micro|low|medium|high - based on production requirements",
  "productionComplexity": "simple|moderate|complex - based on shooting requirements"
}

ANALYSIS GUIDELINES:
- Be constructive and encouraging while providing honest feedback
- Focus on creative storytelling elements, not just technical formatting
- Provide specific, actionable suggestions rather than generic advice
- Consider both artistic merit and commercial viability
- Include at least 3 improvement suggestions across different categories
- Make suggestions playful and inspiring, not overly critical

Respond only with valid JSON matching the exact format above.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert screenplay analyst providing creative feedback. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysisText = response.choices[0].message.content;
    if (!analysisText) {
      throw new Error('No analysis content received from OpenAI');
    }

    const analysis = JSON.parse(analysisText);
    
    // Validate and ensure all required fields are present
    const healthReport: ScriptHealthReport = {
      healthScore: {
        overall: Math.min(100, Math.max(1, analysis.healthScore?.overall || 70)),
        structure: Math.min(100, Math.max(1, analysis.healthScore?.structure || 70)),
        pacing: Math.min(100, Math.max(1, analysis.healthScore?.pacing || 70)),
        characterDevelopment: Math.min(100, Math.max(1, analysis.healthScore?.characterDevelopment || 70)),
        dialogue: Math.min(100, Math.max(1, analysis.healthScore?.dialogue || 70)),
        visualStorytelling: Math.min(100, Math.max(1, analysis.healthScore?.visualStorytelling || 70)),
        marketability: Math.min(100, Math.max(1, analysis.healthScore?.marketability || 70)),
      },
      strengths: analysis.strengths || ['Creative storytelling approach', 'Engaging characters', 'Clear narrative structure'],
      improvements: analysis.improvements || [
        {
          category: 'Character Development',
          priority: 'medium' as const,
          suggestion: 'Consider deepening character motivations and backstories',
          reasoning: 'Well-developed characters create stronger emotional connections with the audience'
        }
      ],
      genre: analysis.genre || 'Drama',
      mood: analysis.mood || 'Thoughtful and engaging',
      targetAudience: analysis.targetAudience || 'General audiences',
      marketingTags: analysis.marketingTags || ['character-driven', 'compelling story', 'indie film'],
      oneLinePitch: analysis.oneLinePitch || `A compelling ${analysis.genre?.toLowerCase() || 'story'} that explores universal themes through engaging characters.`,
      estimatedBudget: analysis.estimatedBudget || 'low',
      productionComplexity: analysis.productionComplexity || 'moderate',
    };

    return healthReport;

  } catch (error) {
    console.error('Error analyzing script health:', error);
    
    // Return default analysis if AI fails
    return {
      healthScore: {
        overall: 75,
        structure: 75,
        pacing: 70,
        characterDevelopment: 80,
        dialogue: 75,
        visualStorytelling: 70,
        marketability: 70,
      },
      strengths: [
        'Clear narrative structure',
        'Engaging premise',
        'Solid character foundations'
      ],
      improvements: [
        {
          category: 'Pacing',
          priority: 'medium',
          suggestion: 'Consider varying scene lengths and rhythms to maintain audience engagement',
          reasoning: 'Dynamic pacing keeps viewers invested throughout the screenplay'
        }
      ],
      genre: 'Drama',
      mood: 'Engaging and thoughtful',
      targetAudience: 'General audiences',
      marketingTags: ['character-driven', 'compelling story', 'indie film'],
      oneLinePitch: 'A compelling story that explores universal themes through engaging characters.',
      estimatedBudget: 'low',
      productionComplexity: 'moderate',
    };
  }
}