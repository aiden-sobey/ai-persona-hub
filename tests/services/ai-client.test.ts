import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { AIClient } from '../../src/services/ai-client';
import { AIConfig, ChatMessage, AIProvider, AIProfile } from '../../src/types';

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
  let testProfile: AIProfile;

  // Helper function to create a mock stream response
  const createMockStream = (chunks: string[]) => ({
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
  });

  beforeEach(() => {
    originalEnv = { ...process.env };

    testProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      systemPrompt: 'You are a test assistant.',
      createdAt: '2024-01-01T00:00:00.000Z',
      maxTokens: 1000,
    };

    // Reset mock agent
    mockAgent = {
      stream: jest.fn(),
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

      const _client = new AIClient(config, testProfile, 'test-api-key');

      expect(process.env.OPENAI_API_KEY).toBe('test-api-key');
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Test Profile',
        instructions: 'You are a test assistant.',
        model: 'mock-openai-model',
      });
    });

    test('should create AIClient with Anthropic provider', () => {
      const config: AIConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 2000,
      };

      new AIClient(config, testProfile, 'test-anthropic-key');

      expect(process.env.ANTHROPIC_API_KEY).toBe('test-anthropic-key');
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Test Profile',
        instructions: 'You are a test assistant.',
        model: 'mock-anthropic-model',
      });
    });

    test('should create AIClient with Google provider', () => {
      const config: AIConfig = {
        provider: 'google',
        model: 'gemini-1.5-flash',
        maxTokens: 1500,
      };

      new AIClient(config, testProfile, 'test-google-key');

      expect(process.env.GOOGLE_GENERATIVE_AI_API_KEY).toBe('test-google-key');
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Test Profile',
        instructions: 'You are a test assistant.',
        model: 'mock-google-model',
      });
    });

    test('should throw error for unsupported provider', () => {
      const config: AIConfig = {
        provider: 'unsupported' as AIProvider,
        model: 'some-model',
      };

      expect(() => new AIClient(config, testProfile, 'test-key')).toThrow(
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
      client = new AIClient(config, testProfile, 'test-key');
    });

    test('should send message and return response', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, world!' },
      ];

      mockAgent.stream.mockResolvedValue(
        createMockStream(['Hello! How can I help you?'])
      );

      const response = await client.sendMessage(messages);

      expect(response).toBe('Hello! How can I help you?');
      expect(mockAgent.stream).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello, world!' }],
        { maxTokens: 1000 }
      );
    });

    test('should handle streaming with callback', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];
      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      mockAgent.stream.mockResolvedValue(
        createMockStream(['Stream', 'ing ', 'response'])
      );

      const response = await client.sendMessage(messages, onChunk);

      expect(response).toBe('Streaming response');
      expect(chunks).toEqual(['Stream', 'ing ', 'response']);
    });

    test('should handle conversation history correctly', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '2+2 equals 4.' },
        { role: 'user', content: 'What about 3+3?' },
      ];

      mockAgent.stream.mockResolvedValue(createMockStream(['6']));

      await client.sendMessage(messages);

      const expectedMessages = [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '2+2 equals 4.' },
        { role: 'user', content: 'What about 3+3?' },
      ];

      expect(mockAgent.stream).toHaveBeenCalledWith(expectedMessages, {
        maxTokens: 1000,
      });
    });

    test('should handle messages without system prompt', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];

      mockAgent.stream.mockResolvedValue(createMockStream(['Hi there!']));

      await client.sendMessage(messages);

      expect(mockAgent.stream).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello!' }],
        { maxTokens: 1000 }
      );
    });

    test('should throw error when AI request fails', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      const aiError = new Error('API rate limit exceeded');
      mockAgent.stream.mockRejectedValue(aiError);

      await expect(client.sendMessage(messages)).rejects.toThrow(
        'AI API error: API rate limit exceeded'
      );
    });

    test('should handle unknown errors', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      mockAgent.stream.mockRejectedValue('Unknown error');

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
      client = new AIClient(config, testProfile, 'test-key');
    });

    test('should return true for successful connection', async () => {
      mockAgent.stream.mockResolvedValue(createMockStream(['Hello']));

      const result = await client.validateConnection();

      expect(result).toBe(true);
      expect(mockAgent.stream).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 1 }
      );
    });

    test('should return false for failed connection', async () => {
      mockAgent.stream.mockRejectedValue(new Error('Connection failed'));

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
      client = new AIClient(config, testProfile, 'test-key');
    });

    test('should update configuration without new API key', () => {
      const updates = { maxTokens: 2000 };

      client.updateConfig(updates);

      // Should not create new agent since no API key changed
      expect(MockAgent).toHaveBeenCalledTimes(1); // Only initial call
    });

    test('should update configuration and recreate agent with new API key', () => {
      const updates = { provider: 'anthropic' as AIProvider };

      client.updateConfig(updates, 'new-api-key');

      expect(process.env.ANTHROPIC_API_KEY).toBe('new-api-key');
      expect(MockAgent).toHaveBeenCalledTimes(2); // Initial + update call
    });
  });
});
