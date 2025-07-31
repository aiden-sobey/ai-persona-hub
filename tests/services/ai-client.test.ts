import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { AIClient } from '../../src/services/ai-client';
import { AIConfig, ChatMessage } from '../../src/types';

// Mock Mastra core
jest.mock('@mastra/core');
import { Agent } from '@mastra/core';
const MockAgent = Agent as any;

// Mock AI SDK providers
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-openai-model'),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mock-anthropic-model'),
}));

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => 'mock-google-model'),
}));

describe('AIClient', () => {
  let mockAgent: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Reset mock agent
    mockAgent = {
      generate: jest
        .fn<() => Promise<{ text: string }>>()
        .mockResolvedValue({ text: 'Mock AI response' }),
    };
    MockAgent.mockReturnValue(mockAgent);
    MockAgent.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create AIClient with OpenAI provider', () => {
      const config: AIConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 1000,
      };

      const _client = new AIClient(config, 'test-api-key');

      expect(process.env.OPENAI_API_KEY).toBe('test-api-key');
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Custom Profile Agent',
        instructions:
          'You are a helpful AI assistant. Follow the system prompt provided in the conversation.',
        model: 'mock-openai-model',
      });
    });

    test('should create AIClient with Anthropic provider', () => {
      const config: AIConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 2000,
      };

      new AIClient(config, 'test-anthropic-key');

      expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Custom Profile Agent',
        instructions:
          'You are a helpful AI assistant. Follow the system prompt provided in the conversation.',
        model: 'mock-anthropic-model',
      });
    });

    test('should create AIClient with Google provider', () => {
      const config: AIConfig = {
        provider: 'google',
        model: 'gemini-1.5-flash',
        maxTokens: 1500,
      };

      new AIClient(config, 'test-google-key');

      expect(process.env.GOOGLE_GENERATIVE_AI_API_KEY).toBe('test-google-key');
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Custom Profile Agent',
        instructions:
          'You are a helpful AI assistant. Follow the system prompt provided in the conversation.',
        model: 'mock-google-model',
      });
    });

    test('should throw error for unsupported provider', () => {
      const config: AIConfig = {
        provider: 'unsupported' as _AIProvider,
        model: 'some-model',
      };

      expect(() => new AIClient(config, 'test-key')).toThrow(
        'Unsupported provider: unsupported'
      );
    });
  });

  describe('sendMessage', () => {
    let client: AIClient;
    let config: AIConfig;

    beforeEach(() => {
      config = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 1000,
      };
      client = new AIClient(config, 'test-key');
    });

    test('should send message and return response', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, world!' },
      ];

      mockAgent.generate.mockResolvedValue({
        text: 'Hello! How can I help you?',
      });

      const response = await client.sendMessage(messages);

      expect(response).toBe('Hello! How can I help you?');
      expect(mockAgent.generate).toHaveBeenCalledWith(
        'You are a helpful assistant.\n\nConversation history:\nuser: Hello, world!\n\nUser: Hello, world!',
        { maxTokens: 1000 }
      );
    });

    test('should handle streaming with callback', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      mockAgent.generate.mockResolvedValue({ text: 'Streaming response' });

      const response = await client.sendMessage(messages, onChunk);

      expect(response).toBe('Streaming response');
      expect(chunks).toEqual(['Streaming response']);
    });

    test('should handle conversation history correctly', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '2+2 equals 4.' },
        { role: 'user', content: 'What about 3+3?' },
      ];

      await client.sendMessage(messages);

      const expectedPrompt =
        'You are a helpful assistant.\n\n' +
        'Conversation history:\n' +
        'user: What is 2+2?\n' +
        'assistant: 2+2 equals 4.\n' +
        'user: What about 3+3?\n\n' +
        'User: What about 3+3?';

      expect(mockAgent.generate).toHaveBeenCalledWith(expectedPrompt, {
        maxTokens: 1000,
      });
    });

    test('should handle messages without system prompt', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];

      await client.sendMessage(messages);

      const expectedPrompt =
        'Conversation history:\nuser: Hello!\n\nUser: Hello!';
      expect(mockAgent.generate).toHaveBeenCalledWith(expectedPrompt, {
        maxTokens: 1000,
      });
    });

    test('should throw error when AI request fails', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      const aiError = new Error('API rate limit exceeded');
      mockAgent.generate.mockRejectedValue(aiError);

      await expect(client.sendMessage(messages)).rejects.toThrow(
        'AI API error: API rate limit exceeded'
      );
    });

    test('should handle unknown errors', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      mockAgent.generate.mockRejectedValue('Unknown error');

      await expect(client.sendMessage(messages)).rejects.toThrow(
        'Unknown error occurred while communicating with AI provider'
      );
    });
  });

  describe('validateConnection', () => {
    let client: AIClient;

    beforeEach(() => {
      const config: AIConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
      };
      client = new AIClient(config, 'test-key');
    });

    test('should return true for successful connection', async () => {
      mockAgent.generate.mockResolvedValue({ text: 'Hello' });

      const result = await client.validateConnection();

      expect(result).toBe(true);
      expect(mockAgent.generate).toHaveBeenCalledWith('Hello', {
        maxTokens: 1,
      });
    });

    test('should return false for failed connection', async () => {
      mockAgent.generate.mockRejectedValue(new Error('Connection failed'));

      const result = await client.validateConnection();

      expect(result).toBe(false);
    });
  });

  describe('updateConfig', () => {
    let client: AIClient;

    beforeEach(() => {
      const config: AIConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 1000,
      };
      client = new AIClient(config, 'test-key');
    });

    test('should update configuration without new API key', () => {
      const updates = { maxTokens: 2000 };

      client.updateConfig(updates);

      // Should not create new agent since no API key changed
      expect(MockAgent).toHaveBeenCalledTimes(1); // Only initial call
    });

    test('should update configuration and recreate agent with new API key', () => {
      const updates = { provider: 'anthropic' as _AIProvider };

      client.updateConfig(updates, 'new-api-key');

      expect(process.env.ANTHROPIC_API_KEY).toBe('new-api-key');
      expect(MockAgent).toHaveBeenCalledTimes(2); // Initial + update call
    });
  });
});
