export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AssistantContext = 'accounting' | 'savings' | 'loan' | 'retail';
