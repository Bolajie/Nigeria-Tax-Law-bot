import { WebhookRequest } from '../types.ts';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

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
        results.push(JSON.parse(snippet)); 
      } catch (e) {}
      currentIndex = endPos + 1;
    } else {
      break;
    }
  }
  return results;
}

function cleanContent(text: string): string {
  if (!text) return '';
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

function processRawResponse(rawBody: string): string {
  const jsonParts = parseJsonStream(rawBody);
  if (jsonParts.length === 0) {
    return cleanContent(rawBody);
  }
  const extracted = jsonParts
    .map(extractFromPart)
    .filter((p): p is { content: string, isFinal: boolean } => p !== null);
  return finalizeText(extracted);
}

export const sendMessageToWebhook = async (
  message: string, 
  sessionId: string,
  onUpdate: (text: string) => void
): Promise<string> => {
    const payload: WebhookRequest = { 
      message, 
      chatInput: message,
      sessionId: sessionId 
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
    } catch (networkError) {
      console.error('Network request failed:', networkError);
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      let errorMessage = `Server error (${response.status}).`;
      
      if (response.status === 503 || response.status === 502) {
        errorMessage = 'The service is temporarily unavailable. Please try again later.';
      } else if (response.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before sending another message.';
      } else if (response.status >= 500) {
        errorMessage = 'Internal server error. The AI agent is having trouble processing your request.';
      }
      
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      try {
        const rawBody = await response.text();
        const finalResult = processRawResponse(rawBody);
        onUpdate(finalResult);
        return finalResult;
      } catch (readError) {
         console.error('Failed to read text response:', readError);
         throw new Error('Received an invalid response from the server.');
      }
    }

    const decoder = new TextDecoder();
    let rawAccumulator = '';
    let lastEmittedText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        rawAccumulator += chunk;

        const currentText = processRawResponse(rawAccumulator);
        if (currentText !== lastEmittedText && currentText.length > 0) {
          lastEmittedText = currentText;
          onUpdate(currentText);
        }
      }
    } catch (streamError) {
      console.error('Stream reading error:', streamError);
      throw new Error('Connection lost while receiving the response. Please try again.');
    }

    const finalResult = processRawResponse(rawAccumulator);
    if (finalResult !== lastEmittedText) {
      onUpdate(finalResult);
    }
    
    return finalResult || "I'm sorry, I couldn't find a clear answer. Please check the FIRS website at https://www.firs.gov.ng for official details.";
};
