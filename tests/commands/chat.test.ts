import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { chatCommand } from '../../src/commands/chat';
import { ProfileManager } from '../../src/services/profile-manager';
import { ConfigManager } from '../../src/utils/config';
import { AIClient } from '../../src/services/ai-client';
import { createMockProfile } from '../setup/test-utils';

// Mock inquirer
jest.mock('inquirer');
import inquirer from 'inquirer';
const mockInquirer = inquirer as any;

// Mock ProfileManager
jest.mock('../../src/services/profile-manager');
const MockProfileManager = ProfileManager as any;

// Mock ConfigManager
jest.mock('../../src/utils/config');
const MockConfigManager = ConfigManager as any;

// Mock AIClient
jest.mock('../../src/services/ai-client');
const MockAIClient = AIClient as any;

// Mock console methods and process.stdout
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;
const originalStdoutWrite = process.stdout.write;

describe.skip('chatCommand', () => {
  let mockProfileManager: any;
  let mockConfigManager: any;
  let mockAIClient: any;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let processExitCode: number | undefined;
  let stdoutOutput: string[];

  beforeEach(() => {
    // Reset mocks
    mockInquirer.__resetMocks();
    MockProfileManager.mockClear();
    MockConfigManager.mockClear();
    MockAIClient.mockClear();

    // Create mock instances
    mockProfileManager = {
      getProfile: jest.fn(),
      updateLastUsed: jest.fn(),
      listProfiles: jest.fn(),
    };
    MockProfileManager.mockImplementation(() => mockProfileManager);

    mockConfigManager = {
      getCurrentProvider: jest.fn(),
      getCurrentModel: jest.fn(),
      getProviderApiKey: jest.fn(),
    };
    MockConfigManager.mockImplementation(() => mockConfigManager);

    mockAIClient = {
      sendMessage: jest.fn(),
    };
    MockAIClient.mockImplementation(() => mockAIClient);

    // Mock console methods
    consoleLogs = [];
    consoleErrors = [];
    stdoutOutput = [];
    processExitCode = undefined;

    console.log = jest.fn((message: string) => {
      consoleLogs.push(message);
    });

    console.error = jest.fn((message: string) => {
      consoleErrors.push(message);
    });

    process.exit = jest.fn((code?: number) => {
      processExitCode = code;
      return undefined as never;
    });

    process.stdout.write = jest.fn((chunk: string) => {
      stdoutOutput.push(chunk);
      return true;
    });
  });

  afterEach(() => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    process.stdout.write = originalStdoutWrite;
  });

  describe('interactive profile selection', () => {
    test('should display available profiles when no profile name provided', async () => {
      const mockProfiles = [
        createMockProfile({
          id: 'profile1',
          name: 'Profile 1',
          systemPrompt: 'Test prompt 1',
        }),
        createMockProfile({
          id: 'profile2',
          name: 'Profile 2',
          systemPrompt: 'Test prompt 2',
        }),
      ];
      mockProfileManager.listProfiles.mockResolvedValue(mockProfiles);
      mockInquirer.__setMockResponses({ selectedProfile: 'profile1' });
      mockConfigManager.getCurrentProvider.mockReturnValue(null);

      await chatCommand();

      expect(mockProfileManager.listProfiles).toHaveBeenCalled();
      expect(mockInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selectedProfile',
          message: 'Select a profile to chat with:',
          choices: expect.any(Array),
          pageSize: 10,
        },
      ]);
    });

    test('should auto-select single profile', async () => {
      const mockProfile = createMockProfile({
        id: 'single',
        name: 'Single Profile',
      });
      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);
      mockConfigManager.getCurrentProvider.mockReturnValue(null);

      await chatCommand();

      expect(
        consoleLogs.some(log => log.includes('Using profile: Single Profile'))
      ).toBe(true);
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    test('should show create message when no profiles exist', async () => {
      mockProfileManager.listProfiles.mockResolvedValue([]);

      await chatCommand();

      expect(
        consoleLogs.some(log =>
          log.includes('No profiles found. Create one with:')
        )
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('cgem create'))).toBe(true);
      expect(processExitCode).toBe(0);
    });
  });

  describe('parameter validation', () => {
    test('should handle missing profile name', async () => {
      await chatCommand('');

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('Usage: cgem chat <profile-name>'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
      expect(mockProfileManager.getProfile).not.toHaveBeenCalled();
    });

    test('should handle null profile name', async () => {
      await chatCommand(null as any);

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle undefined profile name', async () => {
      await chatCommand(undefined as any);

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });
  });

  describe('profile lookup', () => {
    test('should handle profile not found', async () => {
      mockProfileManager.getProfile.mockResolvedValue(null);

      await chatCommand('non-existent-profile');

      expect(mockProfileManager.getProfile).toHaveBeenCalledWith(
        'non-existent-profile'
      );
      expect(
        consoleErrors.some(log =>
          log.includes("Profile 'non-existent-profile' not found")
        )
      ).toBe(true);
      expect(
        consoleLogs.some(log =>
          log.includes('List available profiles with: cgem list')
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should proceed when profile is found', async () => {
      const mockProfile = createMockProfile();
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockConfigManager.getCurrentProvider.mockReturnValue(null); // Will cause early exit

      await chatCommand('Test Profile');

      expect(mockProfileManager.getProfile).toHaveBeenCalledWith(
        'Test Profile'
      );
      expect(processExitCode).toBe(1); // Due to missing provider
    });
  });

  describe('configuration validation', () => {
    let mockProfile: any;

    beforeEach(() => {
      mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
      });
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
    });

    test('should handle missing current provider', async () => {
      mockConfigManager.getCurrentProvider.mockReturnValue(null);
      mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('No AI model configured'))
      ).toBe(true);
      expect(
        consoleLogs.some(log =>
          log.includes('Configure a model first with: cgem model')
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle missing current model', async () => {
      mockConfigManager.getCurrentProvider.mockReturnValue('openai');
      mockConfigManager.getCurrentModel.mockReturnValue(null);

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('No AI model configured'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle missing both provider and model', async () => {
      mockConfigManager.getCurrentProvider.mockReturnValue(null);
      mockConfigManager.getCurrentModel.mockReturnValue(null);

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('No AI model configured'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle missing OpenAI API key', async () => {
      mockConfigManager.getCurrentProvider.mockReturnValue('openai');
      mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');
      mockConfigManager.getProviderApiKey.mockReturnValue('');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('openai API key not found'))
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('Environment: OPENAI_API_KEY'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle missing Anthropic API key', async () => {
      mockConfigManager.getCurrentProvider.mockReturnValue('anthropic');
      mockConfigManager.getCurrentModel.mockReturnValue('claude-3-haiku');
      mockConfigManager.getProviderApiKey.mockReturnValue('');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('anthropic API key not found'))
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('Environment: ANTHROPIC_API_KEY'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle missing Google API key', async () => {
      mockConfigManager.getCurrentProvider.mockReturnValue('google');
      mockConfigManager.getCurrentModel.mockReturnValue('gemini-1.5-flash');
      mockConfigManager.getProviderApiKey.mockReturnValue('');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('google API key not found'))
      ).toBe(true);
      expect(
        consoleLogs.some(log =>
          log.includes('Environment: GOOGLE_GENERATIVE_AI_API_KEY')
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });
  });

  describe('successful chat initialization', () => {
    let mockProfile: any;

    beforeEach(() => {
      mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
        maxTokens: 1000,
      });
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockConfigManager.getCurrentProvider.mockReturnValue('openai');
      mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');
      mockConfigManager.getProviderApiKey.mockReturnValue('test-api-key');
      mockProfileManager.updateLastUsed.mockResolvedValue(undefined);

      // Mock immediate exit to avoid infinite loop
      mockInquirer.__setMockResponses({ userMessage: 'exit' });
    });

    test('should initialize chat successfully', async () => {
      await chatCommand('Test Profile');

      expect(MockAIClient).toHaveBeenCalledWith(
        {
          provider: 'openai',
          model: 'gpt-4o',
          maxTokens: 1000,
        },
        'test-api-key'
      );

      expect(mockProfileManager.updateLastUsed).toHaveBeenCalledWith(
        'Test Profile'
      );

      expect(
        consoleLogs.some(log =>
          log.includes('Starting conversation with Test Profile')
        )
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('Provider: openai'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('Model: gpt-4o'))).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('Type "exit" or "quit" to end'))
      ).toBe(true);
    });

    test('should handle profile without maxTokens', async () => {
      const profileWithoutTokens = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
      });
      delete (profileWithoutTokens as any).maxTokens;
      mockProfileManager.getProfile.mockResolvedValue(profileWithoutTokens);

      await chatCommand('Test Profile');

      expect(MockAIClient).toHaveBeenCalledWith(
        {
          provider: 'openai',
          model: 'gpt-4o',
          maxTokens: undefined,
        },
        'test-api-key'
      );
    });
  });

  describe('conversation loop', () => {
    let mockProfile: any;

    beforeEach(() => {
      mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
      });
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockConfigManager.getCurrentProvider.mockReturnValue('openai');
      mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');
      mockConfigManager.getProviderApiKey.mockReturnValue('test-api-key');
      mockProfileManager.updateLastUsed.mockResolvedValue(undefined);
    });

    test('should handle exit command', async () => {
      mockInquirer.__setMockResponses({ userMessage: 'exit' });

      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('Goodbye! 👋'))).toBe(true);
      expect(mockAIClient.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle quit command', async () => {
      mockInquirer.__setMockResponses({ userMessage: 'quit' });

      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('Goodbye! 👋'))).toBe(true);
      expect(mockAIClient.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle case-insensitive exit commands', async () => {
      mockInquirer.__setMockResponses({ userMessage: 'EXIT' });

      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('Goodbye! 👋'))).toBe(true);

      // Reset and test QUIT
      jest.clearAllMocks();
      consoleLogs = [];
      mockInquirer.__setMockResponses({ userMessage: 'QUIT' });

      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('Goodbye! 👋'))).toBe(true);
    });

    test('should validate empty user input', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation((questions: any) => {
        promptCallCount++;
        const question = Array.isArray(questions) ? questions[0] : questions;

        if (promptCallCount === 1) {
          // Test validation function
          expect(question.validate('')).toBe('Please enter a message');
          expect(question.validate('   ')).toBe('Please enter a message');
          expect(question.validate('valid message')).toBe(true);

          return Promise.resolve({ userMessage: 'exit' });
        }

        return Promise.resolve({ userMessage: 'exit' });
      });

      await chatCommand('Test Profile');

      expect(mockInquirer.prompt).toHaveBeenCalled();
    });

    test('should handle successful AI conversation', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'Hello AI' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage.mockResolvedValue('Hello! How can I help you?');

      await chatCommand('Test Profile');

      expect(mockAIClient.sendMessage).toHaveBeenCalledWith(
        [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Hello AI' },
        ],
        expect.any(Function)
      );

      expect(consoleLogs.some(log => log.includes('thinking...'))).toBe(true);
    });

    test('should handle streaming response', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'Test message' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage.mockImplementation(
        (messages: any, onChunk: any) => {
          onChunk('Hello ');
          onChunk('from ');
          onChunk('AI!');
          return Promise.resolve('Hello from AI!');
        }
      );

      await chatCommand('Test Profile');

      expect(stdoutOutput).toEqual(['Hello ', 'from ', 'AI!']);
    });

    test('should handle empty AI response', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'Test message' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage.mockResolvedValue('');

      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('No response from AI'))).toBe(
        true
      );
    });

    test('should handle null AI response', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'Test message' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage.mockResolvedValue(null);

      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('No response from AI'))).toBe(
        true
      );
    });

    test('should handle AI errors and continue conversation', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'First message' });
        } else if (promptCallCount === 2) {
          return Promise.resolve({ userMessage: 'Second message' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage
        .mockRejectedValueOnce(new Error('API rate limit exceeded'))
        .mockResolvedValueOnce('This works fine');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('Error getting AI response:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log => log.includes('API rate limit exceeded'))
      ).toBe(true);
      expect(
        consoleLogs.some(log =>
          log.includes('You can continue the conversation')
        )
      ).toBe(true);
      expect(mockAIClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('should handle unknown AI errors', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'Test message' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage.mockRejectedValue('Unknown error string');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('Error getting AI response:'))
      ).toBe(true);
      expect(consoleErrors.some(log => log.includes('Unknown error'))).toBe(
        true
      );
    });

    test('should maintain conversation state correctly', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        if (promptCallCount === 1) {
          return Promise.resolve({ userMessage: 'First question' });
        } else if (promptCallCount === 2) {
          return Promise.resolve({ userMessage: 'Follow up question' });
        } else {
          return Promise.resolve({ userMessage: 'exit' });
        }
      });

      mockAIClient.sendMessage
        .mockResolvedValueOnce('First response')
        .mockResolvedValueOnce('Second response');

      await chatCommand('Test Profile');

      // Check first call
      expect(mockAIClient.sendMessage).toHaveBeenNthCalledWith(
        1,
        [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'First question' },
        ],
        expect.any(Function)
      );

      // Check second call includes conversation history
      expect(mockAIClient.sendMessage).toHaveBeenNthCalledWith(
        2,
        [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Follow up question' },
        ],
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    test('should handle ProfileManager.getProfile errors', async () => {
      const error = new Error('Failed to read profile file');
      mockProfileManager.getProfile.mockRejectedValue(error);

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('Error starting chat:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log => log.includes('Failed to read profile file'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle ProfileManager.updateLastUsed errors', async () => {
      const mockProfile = createMockProfile();
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockConfigManager.getCurrentProvider.mockReturnValue('openai');
      mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');
      mockConfigManager.getProviderApiKey.mockReturnValue('test-api-key');

      const error = new Error('Failed to update profile');
      mockProfileManager.updateLastUsed.mockRejectedValue(error);

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('Error starting chat:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log => log.includes('Failed to update profile'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle AIClient constructor errors', async () => {
      const mockProfile = createMockProfile();
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockConfigManager.getCurrentProvider.mockReturnValue('openai');
      mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');
      mockConfigManager.getProviderApiKey.mockReturnValue('test-api-key');
      mockProfileManager.updateLastUsed.mockResolvedValue(undefined);

      const error = new Error('Failed to initialize AI client');
      MockAIClient.mockImplementation(() => {
        throw error;
      });

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('Error starting chat:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log =>
          log.includes('Failed to initialize AI client')
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle unknown errors', async () => {
      mockProfileManager.getProfile.mockRejectedValue('Unknown error string');

      await chatCommand('Test Profile');

      expect(
        consoleErrors.some(log => log.includes('Error starting chat:'))
      ).toBe(true);
      expect(consoleErrors.some(log => log.includes('Unknown error'))).toBe(
        true
      );
      expect(processExitCode).toBe(1);
    });
  });

  describe('user interface', () => {
    let mockProfile: any;

    beforeEach(() => {
      mockProfile = createMockProfile({
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
      });
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockConfigManager.getCurrentProvider.mockReturnValue('anthropic');
      mockConfigManager.getCurrentModel.mockReturnValue('claude-3-haiku');
      mockConfigManager.getProviderApiKey.mockReturnValue('test-api-key');
      mockProfileManager.updateLastUsed.mockResolvedValue(undefined);
      mockInquirer.__setMockResponses({ userMessage: 'exit' });
    });

    test('should use correct inquirer prompt configuration', async () => {
      mockInquirer.prompt.mockImplementation((questions: any) => {
        const question = Array.isArray(questions) ? questions[0] : questions;

        expect(question.type).toBe('input');
        expect(question.name).toBe('userMessage');
        expect(question.message).toContain('You:');
        expect(typeof question.validate).toBe('function');

        return Promise.resolve({ userMessage: 'exit' });
      });

      await chatCommand('Test Profile');

      expect(mockInquirer.prompt).toHaveBeenCalled();
    });

    test('should display correct provider and model information', async () => {
      await chatCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('Provider: anthropic'))).toBe(
        true
      );
      expect(
        consoleLogs.some(log => log.includes('Model: claude-3-haiku'))
      ).toBe(true);
    });
  });
});
