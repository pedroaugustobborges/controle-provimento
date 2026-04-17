export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date;
  isReply?: boolean;
}

export type ChatStep = 'INITIAL' | 'ALERTS' | 'FEEDBACK' | 'NEWS';
