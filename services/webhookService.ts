import { WebhookRequest } from '../types.ts';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

/**
 * Aggressive patterns to strip out agent reasoning, thoughts, and technical metadata.
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
  // Catch leaked JSON-like blocks in string content
  /\{\s*"(query|tool|toolInput|log|thought|nodeName|metadata|action)"[\s\S]*?\}/gi,
  /\[(Vector store|nodeName|metadata|Step|Thought|Action|Observation|Calling|Search).*?\]/gi,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
];

/**
 * Extracts complete JSON objects from a stream that might contain partial data.
 */
function parseJsonStream(text: string): any[] {
  const results: any[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const startBrace = text.indexOf('{', currentIndex);
    const startBracket = text.indexOf('[', currentIndex);
    
    let startPos = -1;
    if (startBrace !== -1 && startBracket !== -1) {
      startPos = Math.min(startBrace, startBracket);
    } else if (startBrace !== -1) {
      startPos = startBrace;
    } else if (startBracket !== -1) {
      startPos = startBracket;
    }

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
      try { 
        const parsed = JSON.parse(snippet);
        if (Array.isArray(parsed)) results.push(...parsed);
        else results.push(parsed);
      } catch (e) {}
      currentIndex = endPos + 1;
    } else {
      break;
    }
  }
  return results;
}

/**
 * Strips internal chatter and ensures we aren't displaying raw JSON.
 */
function cleanContent(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  
  if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || 
      (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
    return '';
  }

  NOISE_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned
    .replace(/^['\s\.\]\|]+/, '')
    .replace(/['\s\.\[\]\|]+$/, '')
    .trim();
}

/**
 * Identifies final answer content vs intermediate reasoning steps.
 */
function extractFromPart(part: any): { content: string, isFinal: boolean } | null {
  if (typeof part !== 'object' || part === null) return null;

  const metadata = part.metadata || {};
  const nodeName = (metadata.nodeName || '').toLowerCase();
  
  const internalNodes = [
    'vector store', 'search', 'agent reasoning', 'thinking', 
    'google search', 'retriever', 'tool', 'ai agent', 'thought'
  ];
  
  if (internalNodes.some(name => nodeName.includes(name))) return null;

  const isFinalNode = /respond|output|reply|final|answer|completion/i.test(nodeName);
  const fields = ['output', 'reply', 'response', 'content', 'text', 'message'];
  
  for (const field of fields) {
    const val = part[field];
    if (typeof val === 'string' && val.trim()) {
      const cleaned = val.trim();
      if (cleaned.startsWith('{') || cleaned.startsWith('[')) continue;
      return { content: cleaned, isFinal: isFinalNode };
    }
  }
  
  return null;
}

/**
 * Aggregates parts, discarding intermediate reasoning if final content exists.
 */
function finalizeText(extracted: { content: string, isFinal: boolean }[]): string {
  const validParts = extracted
    .map(p => ({ content: cleanContent(p.content), isFinal: p.isFinal }))
    .filter(p => p.content.length > 0);

  if (validParts.length === 0) return '';

  const finalParts = validParts.filter(p => p.isFinal);
  
  if (finalParts.length > 0) {
    // Return the latest final node content (usually accumulated)
    return finalParts[finalParts.length - 1].content;
  }

  // Hide intermediate reasoning strings to keep the UI clean
  return '';
}

function processRawResponse(rawBody: string): string {
  const jsonParts = parseJsonStream(rawBody);

  if (jsonParts.length > 0) {
    const extracted = jsonParts
      .map(extractFromPart)
      .filter((p): p is { content: string, isFinal: boolean } => p !== null);

    if (extracted.length > 0) {
      return finalizeText(extracted);
    }
    return '';
  }

  const cleaned = cleanContent(rawBody);
  if (cleaned.startsWith('{')) return '';
  return cleaned;
}

export const sendMessageToWebhook = async (
  message: string,
  sessionId: string,
  onUpdate: (text: string) => void
): Promise<string> => {
  const payload: WebhookRequest = {
    message,
    chatInput: message,
    sessionId: sessionId,
  };

  let response: Response;
  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error('Unable to connect to the tax knowledge base. Please check your network.');
  }

  if (!response.ok) throw new Error(`Agent returned error ${response.status}.`);

  const reader = response.body?.getReader();
  if (!reader) {
    const finalResult = processRawResponse(await response.text());
    onUpdate(finalResult);
    return finalResult;
  }

  const decoder = new TextDecoder();
  let rawAccumulator = '';
  let targetText = '';
  let displayedText = '';
  let animationFrameId: number | null = null;

  const runAnimationStep = () => {
    if (displayedText.length >= targetText.length) {
      animationFrameId = null;
      return;
    }
    const increment = Math.max(1, Math.ceil((targetText.length - displayedText.length) / 8));
    displayedText = targetText.substring(0, displayedText.length + increment);
    onUpdate(displayedText);
    animationFrameId = requestAnimationFrame(runAnimationStep);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawAccumulator += decoder.decode(value, { stream: true });
      const processed = processRawResponse(rawAccumulator);
      if (processed) {
        targetText = processed;
        if (!animationFrameId && targetText.length > displayedText.length) {
          runAnimationStep();
        }
      }
    }
  } catch (err) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    throw err;
  }

  return new Promise((resolve) => {
    const check = () => {
      if (animationFrameId === null) {
        if (displayedText !== targetText && targetText) onUpdate(targetText);
        resolve(targetText || "I'm sorry, I couldn't find a specific answer in the current tax laws.");
      } else requestAnimationFrame(check);
    };
    check();
  });
};