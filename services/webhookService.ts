import { WebhookRequest } from '../types';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

/**
 * Technical noise patterns that indicate agent "inner monologue", tool logs, or artifacts.
 * Patterns are refined to avoid stripping valid Markdown syntax.
 */
const NOISE_PATTERNS = [
  /Calling\s+[\w\s_-]+\s+with\s+input:.*?(\{.*?\})?/gi,
  /Thought:.*?(?=\n|$)/gi,
  /Next tool:.*?(?=\n|$)/gi,
  /Found in Steps.*?(?=\n|$)/gi,
  /Scenario:.*?(?=\n|$)/gi,
  /Keywords:.*?(?=\n|$)/gi,
  /Action:.*?(?=\n|$)/gi,
  /Action Input:.*?(?=\n|$)/gi,
  /Observation:.*?(?=\n|$)/gi,
  // Targeted bracket stripping: Only remove if it contains technical keywords or is empty/small noise
  /\[(Vector store|nodeName|metadata|Step|Thought|Action|Observation|Calling|Search).*?\]/gi,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi // UUIDs
];

/**
 * Extracts JSON objects from the n8n stream string.
 */
function parseJsonStream(text: string): any[] {
  const results: any[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const startBrace = text.indexOf('{', currentIndex);
    const startBracket = text.indexOf('[', currentIndex);
    let startPos = (startBrace !== -1 && startBracket !== -1) 
      ? Math.min(startBrace, startBracket) 
      : (startBrace !== -1 ? startBrace : startBracket);

    if (startPos === -1) break;

    let depth = 0;
    let endPos = -1;
    const opener = text[startPos];
    const closer = opener === '{' ? '}' : ']';

    for (let i = startPos; i < text.length; i++) {
      if (text[i] === opener) depth++;
      else if (text[i] === closer) {
        depth--;
        if (depth === 0) {
          endPos = i;
          break;
        }
      }
    }

    if (endPos !== -1) {
      const snippet = text.substring(startPos, endPos + 1);
      try { results.push(JSON.parse(snippet)); } catch (e) {}
      currentIndex = endPos + 1;
    } else break;
  }
  return results;
}

/**
 * Cleans a string from technical artifacts while preserving Markdown formatting.
 */
function cleanContent(text: string): string {
  let cleaned = text.trim();
  
  // Apply regex cleaning
  NOISE_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Specifically target isolated artifacts often found at the start/end of n8n streams
  return cleaned
    .replace(/^['\s\.\]\|]+/, '') // Clean start
    .replace(/['\s\.\[\]\|]+$/, '') // Clean end
    .trim();
}

/**
 * Extracts content from n8n parts with priority for the final response node.
 */
function extractFromPart(part: any): { content: string, isFinal: boolean } | null {
  if (typeof part !== 'object' || part === null) return null;

  const nodeName = part.metadata?.nodeName || '';
  const isFinalNode = nodeName.toLowerCase().includes('respond') || nodeName.toLowerCase().includes('output');

  const fields = ['content', 'output', 'text', 'reply', 'response'];
  for (const field of fields) {
    if (part[field] && typeof part[field] === 'string') {
      const val = part[field].trim();
      if (val) {
        return { content: val, isFinal: isFinalNode };
      }
    }
  }
  return null;
}

/**
 * Smart de-duplication and filtering to handle streaming artifacts and echoes.
 */
function finalizeText(extracted: { content: string, isFinal: boolean }[]): string {
  // Step 1: Clean all blocks
  const cleaned = extracted
    .map(p => ({ content: cleanContent(p.content), isFinal: p.isFinal }))
    .filter(p => p.content.length > 0);

  // Step 2: Preference for final response nodes
  const finalNodes = cleaned.filter(p => p.isFinal);
  const source = finalNodes.length > 0 ? finalNodes : cleaned;

  // Step 3: Prefix/Suffix Suppression (Stream de-duplication)
  const contents = source.map(p => p.content);
  const sorted = [...new Set(contents)].sort((a, b) => b.length - a.length);
  
  const unique: string[] = [];
  for (const str of sorted) {
    // Check if this string is already effectively contained in an accepted one
    if (!unique.some(u => u.includes(str))) {
      // Filter out technical fragments that are too short to be meaningful 
      // when we already have long, structured content.
      if (str.length < 15 && sorted.some(s => s.length > 40)) {
        // Only keep if it doesn't look like an artifact
        if (/^[a-z\s]+$/i.test(str)) continue;
      }
      unique.push(str);
    }
  }

  // Step 4: Final Join and cleanup of node names
  let result = unique.reverse().join('\n\n').trim();

  // Final sweep for common leakages
  const technicalTerms = ['Respond to Webhook', 'AI Agent', 'Vector store', 'nodeName', 'metadata'];
  technicalTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, '');
  });

  return result.trim();
}

export const sendMessageToWebhook = async (message: string): Promise<string> => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ message, chatInput: message }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const rawBody = await response.text();
    const jsonParts = parseJsonStream(rawBody);
    
    if (jsonParts.length === 0) {
      return cleanContent(rawBody) || 'No clear response received.';
    }

    const extracted = jsonParts
      .map(extractFromPart)
      .filter((p): p is { content: string, isFinal: boolean } => p !== null);

    const result = finalizeText(extracted);
    
    return result || "I'm sorry, I couldn't find a clear answer. Please check the FIRS website at https://www.firs.gov.ng for official details.";

  } catch (error: any) {
    console.error('Webhook Error:', error);
    throw new Error('Communication failed. Please check your connection and try again.');
  }
};