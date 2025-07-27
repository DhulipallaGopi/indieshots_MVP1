import { screenplayParser, type ParsedScene, type ParseOptions } from './scriptParser';

// Legacy interface for backward compatibility
interface ParseScriptOptions {
  content: string;
  selectedColumns: string[];
  maxPages?: number;
}

/**
 * Perform a simple regex-based preview parse of a script
 * This is used for the free preview functionality (first 2 pages only)
 */
export async function previewParse(scriptContent: string): Promise<ParsedScene[]> {
  return screenplayParser.previewParse(scriptContent);
}

/**
 * Parse a screenplay script using GPT-4 to extract structured data
 */
export async function parseScriptWithAI({ content, selectedColumns, maxPages = 5 }: ParseScriptOptions): Promise<ParsedScene[]> {
  return screenplayParser.parseScript({
    content,
    selectedColumns,
    maxPages,
    isPremium: false
  });
}