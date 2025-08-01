import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { AIClient } from '../../src/services/ai-client';
import { AIConfig, AIProvider, AIProfile } from '../../src/types';

// Mock Mastra core
jest.mock('@mastra/core');
import { Agent } from '@mastra/core';
const MockAgent = Agent as any;

// Mock Mastra memory
jest.mock('@mastra/memory');
import { Memory } from '@mastra/memory';
const MockMemory = Memory as any;

// Mock Mastra LibSQL
jest.mock('@mastra/libsql');
import { LibSQLStore } from '@mastra/libsql';
const MockLibSQLStore = LibSQLStore as any;

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

    // Reset mock memory
    MockMemory.mockReturnValue({});
    MockMemory.mockClear();

    // Reset mock LibSQL store
    MockLibSQLStore.mockReturnValue({});
    MockLibSQLStore.mockClear();
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
      expect(MockMemory).toHaveBeenCalledWith({
        storage: expect.any(Object),
        options: {
          workingMemory: { enabled: true },
        },
      });
      expect(MockAgent).toHaveBeenCalledWith({
        name: 'Test Profile',
        instructions: 'You are a test assistant.',
        model: 'mock-openai-model',
        memory: expect.any(Object),
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
        memory: expect.any(Object),
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
        memory: expect.any(Object),
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
      const userMessage = 'Hello, world!';

      mockAgent.stream.mockResolvedValue(
        createMockStream(['Hello! How can I help you?'])
      );

      const response = await client.sendMessage(userMessage);

      expect(response).toBe('Hello! How can I help you?');
      expect(mockAgent.stream).toHaveBeenCalledWith(userMessage, {
        maxTokens: 1000,
        resourceId: 'test-profile',
        threadId: expect.any(String),
      });
    });

    test('should handle streaming with callback', async () => {
      const userMessage = 'Test message';
      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      mockAgent.stream.mockResolvedValue(
        createMockStream(['Stream', 'ing ', 'response'])
      );

      const response = await client.sendMessage(userMessage, onChunk);

      expect(response).toBe('Streaming response');
      expect(chunks).toEqual(['Stream', 'ing ', 'response']);
    });

    test('should handle memory-managed conversations correctly', async () => {
      const userMessage = 'What about 3+3?';

      mockAgent.stream.mockResolvedValue(createMockStream(['6']));

      await client.sendMessage(userMessage);

      expect(mockAgent.stream).toHaveBeenCalledWith(userMessage, {
        maxTokens: 1000,
        resourceId: 'test-profile',
        threadId: expect.any(String),
      });
    });

    test('should handle simple messages correctly', async () => {
      const userMessage = 'Hello!';

      mockAgent.stream.mockResolvedValue(createMockStream(['Hi there!']));

      await client.sendMessage(userMessage);

      expect(mockAgent.stream).toHaveBeenCalledWith(userMessage, {
        maxTokens: 1000,
        resourceId: 'test-profile',
        threadId: expect.any(String),
      });
    });

    test('should throw error when AI request fails', async () => {
      const userMessage = 'Test message';

      const aiError = new Error('API rate limit exceeded');
      mockAgent.stream.mockRejectedValue(aiError);

      await expect(client.sendMessage(userMessage)).rejects.toThrow(
        'AI API error: API rate limit exceeded'
      );
    });

    test('should handle unknown errors', async () => {
      const userMessage = 'Test message';

      mockAgent.stream.mockRejectedValue('Unknown error');

      await expect(client.sendMessage(userMessage)).rejects.toThrow(
        'Unknown error occurred while communicating with AI provider'
      );
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
