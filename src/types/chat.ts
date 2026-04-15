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

export type ChatStep = 'INITIAL' | 'BY_REGION' | 'BY_UNIT' | 'BY_PERSON' | 'BY_ROLE' | 'CONVERSATION' | 'FEEDBACK' | 'COMMUNICATION_HUB' | 'BY_USER' | 'SUPERVISION' | 'NEWS';
