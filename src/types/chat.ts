export interface Unit {
  id: string;
  name: string;
  region: 'GOIÁS E ESPÍRITO SANTO' | 'AMAZONAS' | 'OUTRAS UNIDADES';
  analysts: string[];
  assistants: string[];
}

export interface Role {
  id: string;
  label: string;
  users: string[];
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date;
  isReply?: boolean;
}

// Simplified — AGIE now only handles system notifications, feedback and news.
export type ChatStep = 'INITIAL' | 'ALERTS' | 'FEEDBACK' | 'NEWS';
