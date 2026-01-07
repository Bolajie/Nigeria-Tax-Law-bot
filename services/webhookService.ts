import { WebhookRequest } from '../types';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

/**
 * Technical noise patterns that indicate agent "inner monologue", tool logs, or artifacts.
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
  /\[(Vector store|nodeName|metadata|Step|Thought|Action|Observation|Calling|Search).*?\]/gi,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
];

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

function cleanContent(text: string): string {
  let cleaned = text.trim();
  NOISE_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  return cleaned
    .replace(/^['\s\.\]\|]+/, '')
    .replace(/['\s\.\[\]\|]+$/, '')
    .trim();
}

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

function finalizeText(extracted: { content: string, isFinal: boolean }[]): string {
  const cleaned = extracted
    .map(p => ({ content: cleanContent(p.content), isFinal: p.isFinal }))
    .filter(p => p.content.length > 0);

  const finalNodes = cleaned.filter(p => p.isFinal);
  const source = finalNodes.length > 0 ? finalNodes : cleaned;

  const contents = source.map(p => p.content);
  const sorted = [...new Set(contents)].sort((a, b) => b.length - a.length);
  
  const unique: string[] = [];
  for (const str of sorted) {
    if (!unique.some(u => u.includes(str))) {
      if (str.length < 15 && sorted.some(s => s.length > 40)) {
        if (/^[a-z\s]+$/i.test(str)) continue;
      }
      unique.push(str);
    }
  }

  let result = unique.reverse().join('\n\n').trim();

  const technicalTerms = ['Respond to Webhook', 'AI Agent', 'Vector store', 'nodeName', 'metadata'];
  technicalTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, '');
  });

  return result.trim();
}

export const sendMessageToWebhook = async (message: string, sessionId: string): Promise<string> => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ 
        message, 
        chatInput: message,
        sessionId: sessionId 
      }),
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