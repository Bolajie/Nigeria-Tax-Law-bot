
import { WebhookRequest, WebhookResponse } from '../types';

const WEBHOOK_URL = 'https://n8n.ibolajie.work.gd/webhook/c79b3b46-f549-4372-934f-3f01c8f92aab/chat';

export const sendMessageToWebhook = async (message: string): Promise<string> => {
  try {
    const payload: WebhookRequest = { message };
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to communicate with the AI agent. Status: ${response.status}`);
    }

    const data: WebhookResponse = await response.json();
    return data.reply;
  } catch (error) {
    console.error('Webhook Error:', error);
    throw error;
  }
};
