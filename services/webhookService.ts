
import { WebhookRequest } from '../types';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

/**
 * Extracts all valid JSON objects from a string that might contain multiple
 * concatenated objects (common in n8n execution metadata streams).
 */
const extractAllJsonObjects = (text: string): any[] => {
  const objects: any[] = [];
  const trimmed = text.trim();
  if (!trimmed) return objects;

  // Try standard split by newline first (NDJSON)
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (lineTrimmed) {
      try {
        objects.push(JSON.parse(lineTrimmed));
      } catch (e) {
        // Not a single line JSON, continue to character-by-character extraction
      }
    }
  }

  // If we couldn't parse anything from lines, or if the response is concatenated objects on one line
  if (objects.length === 0) {
    let depth = 0;
    let startIdx = -1;

    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === '{' || trimmed[i] === '[') {
        if (depth === 0) startIdx = i;
        depth++;
      } else if (trimmed[i] === '}' || trimmed[i] === ']') {
        depth--;
        if (depth === 0 && startIdx !== -1) {
          const potentialJson = trimmed.substring(startIdx, i + 1);
          try {
            objects.push(JSON.parse(potentialJson));
          } catch (e) {
            // Ignore invalid segments
          }
          startIdx = -1;
        }
      }
    }
  }

  return objects.length > 0 ? objects : [trimmed];
};

export const sendMessageToWebhook = async (message: string): Promise<string> => {
  console.log('--- Outgoing Request ---');
  console.log('To:', WEBHOOK_URL);
  console.log('Payload:', { message });

  try {
    const payload: WebhookRequest = { message };
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
    });

    console.log('--- Incoming Response ---');
    console.log('Status:', response.status, response.statusText);

    const rawText = await response.text();
    console.log('Raw Body Received:', rawText);

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${rawText || 'No body content'}`);
    }

    const allParsedParts = extractAllJsonObjects(rawText);
    console.log('All Extracted Parts:', allParsedParts);

    // Find the actual content part. n8n often sends "metadata" or "begin" objects first.
    // We look for parts that have actual response keys.
    for (const part of allParsedParts) {
      // Skip the "begin" metadata object you are seeing
      if (part && typeof part === 'object' && part.type === 'begin' && !part.output && !part.text && !part.reply) {
        continue;
      }

      // Try to extract content from this part
      if (typeof part === 'string') return part;
      
      const content = part.output || part.reply || part.text || part.response || part.message || (part.data ? part.data.output : null);
      if (content) return typeof content === 'string' ? content : JSON.stringify(content);
    }

    // Fallback: If we have objects but none matched our keys, return the last non-metadata object or raw text
    const lastPart = allParsedParts[allParsedParts.length - 1];
    if (typeof lastPart === 'string') return lastPart;
    if (lastPart && typeof lastPart === 'object') return JSON.stringify(lastPart);

    return 'The AI sent a response but no content could be extracted.';

  } catch (error: any) {
    console.error('--- Webhook Error Trace ---');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    if (error.message === 'Failed to fetch') {
      throw new Error('CORS Error: The n8n server is blocking the request. Ensure n8n is configured to allow Cross-Origin requests.');
    }
    
    throw error;
  }
};
