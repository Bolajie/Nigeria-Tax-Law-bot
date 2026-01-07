export type Sender = 'user' | 'ai';

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

export interface WebhookResponse {
  reply: string;
}

export interface WebhookRequest {
  message: string;
  chatInput?: string;
  sessionId?: string;
}