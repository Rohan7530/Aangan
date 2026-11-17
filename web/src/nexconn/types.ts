// Plain types shared between the Nexconn wrapper and the UI.
// Components import these, never the SDK itself.

export type ConnectionState = 'connecting' | 'connected' | 'offline';

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  text: string;
  sentAt: number; // server time, ms
}

export interface Sender {
  userId: string;
  name: string;
}

export type NexconnAreaCode = 'SG' | 'NA' | 'SA';
