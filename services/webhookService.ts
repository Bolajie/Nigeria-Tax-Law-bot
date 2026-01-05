import { WebhookRequest } from '../types';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

/**
 * Regex patterns for cleaning technical noise
 */
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const TOOL_CALL_REGEX = /Calling\s+[\w_-]+\s+with\s+input:.*?(\{.*?\})?/gi;

/**
 * Technical labels from n8n nodes that shouldn't be part of the UI response
 */
const NOISE_LABELS = [
  'AI Agent',
  'Respond to Webhook',
  'Webhook',
  'n8n',
  'item end',
  'item',
  'Vector_store',
  'Get_document_metadata'
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
 * Extracts the most relevant content from a parsed JSON part.
 */
function extractContent(part: any): string | null {
  // If it's a string, clean it
  if (typeof part === 'string') return part;

  // Prioritize the 'content' field as per n8n's standard AI/Webhook output
  if (part.content && typeof part.content === 'string') {
    const val = part.content.trim();
    // Filter out tool call logs immediately
    if (TOOL_CALL_REGEX.test(val)) return null;
    return val;
  }

  // Fallback to other common fields but EXCLUDE metadata/type/nodeName
  const priorityFields = ['output', 'text', 'reply', 'response'];
  for (const field of priorityFields) {
    if (part[field] && typeof part[field] === 'string') {
      const val = part[field].trim();
      if (!TOOL_CALL_REGEX.test(val)) return val;
    }
  }

  return null;
}

/**
 * Final sanitization and de-duplication of the aggregated text.
 */
function finalizeText(fragments: string[]): string {
  // 1. Remove fragments that are substrings of others (n8n streaming often sends partials then fulls)
  const uniqueFragments = fragments
    .filter(f => f.length > 0)
    .sort((a, b) => b.length - a.length);

  const bestFragments: string[] = [];
  for (const frag of uniqueFragments) {
    if (!bestFragments.some(existing => existing.includes(frag))) {
      bestFragments.push(frag);
    }
  }

  // 2. Join and perform noise removal
  let combined = bestFragments.reverse().join('\n\n');

  // Remove UUIDs
  combined = combined.replace(UUID_REGEX, '');

  // Remove Tool Calls that might be embedded
  combined = combined.replace(TOOL_CALL_REGEX, '');

  // Remove Noise Labels
  NOISE_LABELS.forEach(label => {
    const regex = new RegExp(`\\b${label}\\b`, 'gi');
    combined = combined.replace(regex, '');
  });

  // 3. Paragraph-level cleanup
  return combined
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 5) // Ignore tiny fragments of noise
    .filter((p, i, self) => self.indexOf(p) === i) // Deduplicate identical paragraphs
    .join('\n\n')
    .trim();
}

export const sendMessageToWebhook = async (message: string): Promise<string> => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      // Send both keys for maximum compatibility with various n8n configurations
      body: JSON.stringify({ message, chatInput: message }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const rawBody = await response.text();
    const jsonParts = parseJsonStream(rawBody);
    
    // If no JSON was found, clean the raw body and use it
    if (jsonParts.length === 0) {
      return finalizeText([rawBody]) || 'No clear response received.';
    }

    const collectedFragments: string[] = [];
    for (const part of jsonParts) {
      const content = extractContent(part);
      if (content) collectedFragments.push(content);
    }

    const result = finalizeText(collectedFragments);
    return result || 'The agent processed the request but the output was empty.';

  } catch (error: any) {
    console.error('Webhook Error:', error);
    throw new Error('Failed to connect to the tax assistant. Please try again.');
  }
};