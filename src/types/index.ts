export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface AIProfile {
  id: string;
  name: string;
  systemPrompt: string;
  maxTokens?: number;
  createdAt: string;
  lastUsed?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationState {
  profileId: string;
  messages: ChatMessage[];
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  maxTokens?: number;
}

export interface ProviderConfig {
  openai?: {
    apiKey: string;
  };
  anthropic?: {
    apiKey: string;
  };
  google?: {
    apiKey: string;
  };
}

export interface ConversationMetadata {
  id: string;
  profileId: string;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ChatHistory {
  profileId: string;
  userMessages: string[];
  lastUpdated: string;
}

export interface SavedConversation {
  metadata: ConversationMetadata;
  messages: ChatMessage[];
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
  google: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
};
