import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { modelCommand, modelListCommand } from '../../src/commands/model';
import { ConfigManager } from '../../src/utils/config';

// Mock inquirer
jest.mock('inquirer');
import inquirer from 'inquirer';
const mockInquirer = inquirer as any;

// Mock ConfigManager
jest.mock('../../src/utils/config');
const MockConfigManager = ConfigManager as any;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;

describe('model commands', () => {
  let mockConfigManager: any;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let processExitCode: number | undefined;

  beforeEach(() => {
    // Reset mocks
    mockInquirer.__resetMocks();
    MockConfigManager.mockClear();

    // Create mock config manager instance
    mockConfigManager = {
      getAvailableProviders: jest.fn(),
      getCurrentProvider: jest.fn(),
      getCurrentModel: jest.fn(),
      setCurrentProviderAndModel: jest.fn(),
    };
    MockConfigManager.mockImplementation(() => mockConfigManager);

    // Mock console methods
    consoleLogs = [];
    consoleErrors = [];
    processExitCode = undefined;

    console.log = jest.fn((...args: any[]) => {
      consoleLogs.push(args.join(' '));
    });

    console.error = jest.fn((...args: any[]) => {
      consoleErrors.push(args.join(' '));
    });

    process.exit = jest.fn((code?: number) => {
      processExitCode = code;
      return undefined as never;
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  describe('modelCommand', () => {
    describe('no providers configured', () => {
      test('should handle no available providers', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue([]);

        await modelCommand();

        expect(
          consoleErrors.some(log => log.includes('No AI providers configured'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('Please set up API keys'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('OpenAI: OPENAI_API_KEY'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('Anthropic: ANTHROPIC_API_KEY'))
        ).toBe(true);
        expect(
          consoleLogs.some(log =>
            log.includes('Google: GOOGLE_GENERATIVE_AI_API_KEY')
          )
        ).toBe(true);
        expect(processExitCode).toBe(1);
        expect(mockInquirer.prompt).not.toHaveBeenCalled();
      });
    });

    describe('successful model configuration', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue([
          'openai',
          'anthropic',
        ]);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);
      });

      test('should configure OpenAI model successfully', async () => {
        let promptCallCount = 0;
        mockInquirer.prompt.mockImplementation(() => {
          promptCallCount++;
          if (promptCallCount === 1) {
            return Promise.resolve({ value: 'openai' });
          } else if (promptCallCount === 2) {
            return Promise.resolve({ value: 'gpt-4o' });
          }
          return Promise.resolve({ value: 'default' });
        });

        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );

        await modelCommand();

        expect(
          mockConfigManager.setCurrentProviderAndModel
        ).toHaveBeenCalledWith('openai', 'gpt-4o');
        expect(
          consoleLogs.some(log => log.includes('Model configuration updated!'))
        ).toBe(true);
        expect(consoleLogs.some(log => log.includes('Provider: openai'))).toBe(
          true
        );
        expect(consoleLogs.some(log => log.includes('Model: gpt-4o'))).toBe(
          true
        );
        expect(
          consoleLogs.some(log =>
            log.includes('You can now chat with any profile')
          )
        ).toBe(true);
      });

      test('should configure Anthropic model successfully', async () => {
        let promptCallCount = 0;
        mockInquirer.prompt.mockImplementation(() => {
          promptCallCount++;
          if (promptCallCount === 1) {
            return Promise.resolve({ value: 'anthropic' });
          } else if (promptCallCount === 2) {
            return Promise.resolve({ value: 'claude-3-5-haiku-20241022' });
          }
          return Promise.resolve({ value: 'default' });
        });

        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );

        await modelCommand();

        expect(
          mockConfigManager.setCurrentProviderAndModel
        ).toHaveBeenCalledWith('anthropic', 'claude-3-5-haiku-20241022');
        expect(
          consoleLogs.some(log => log.includes('Provider: anthropic'))
        ).toBe(true);
        expect(
          consoleLogs.some(log =>
            log.includes('Model: claude-3-5-haiku-20241022')
          )
        ).toBe(true);
      });

      test('should configure Google model successfully', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['google']);

        let promptCallCount = 0;
        mockInquirer.prompt.mockImplementation(() => {
          promptCallCount++;
          if (promptCallCount === 1) {
            return Promise.resolve({ value: 'google' });
          } else if (promptCallCount === 2) {
            return Promise.resolve({ value: 'gemini-1.5-flash' });
          }
          return Promise.resolve({ value: 'default' });
        });

        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );

        await modelCommand();

        expect(
          mockConfigManager.setCurrentProviderAndModel
        ).toHaveBeenCalledWith('google', 'gemini-1.5-flash');
        expect(consoleLogs.some(log => log.includes('Provider: google'))).toBe(
          true
        );
        expect(
          consoleLogs.some(log => log.includes('Model: gemini-1.5-flash'))
        ).toBe(true);
      });
    });

    describe('current settings display', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue([
          'openai',
          'anthropic',
        ]);
        mockInquirer.__setMockResponses({ value: 'openai' });
        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );
      });

      test('should display current settings when available', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue('anthropic');
        mockConfigManager.getCurrentModel.mockReturnValue(
          'claude-3-5-sonnet-20241022'
        );

        await modelCommand();

        expect(
          consoleLogs.some(log =>
            log.includes('Current: anthropic - claude-3-5-sonnet-20241022')
          )
        ).toBe(true);
      });

      test('should not display current settings when not available', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelCommand();

        expect(consoleLogs.some(log => log.includes('Current:'))).toBe(false);
      });

      test('should not display current settings when only provider is available', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue('openai');
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelCommand();

        expect(consoleLogs.some(log => log.includes('Current:'))).toBe(false);
      });

      test('should not display current settings when only model is available', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');

        await modelCommand();

        expect(consoleLogs.some(log => log.includes('Current:'))).toBe(false);
      });
    });

    describe('provider selection', () => {
      beforeEach(() => {
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);
        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );
      });

      test('should present all available providers with proper names', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue([
          'openai',
          'anthropic',
          'google',
        ]);

        mockInquirer.prompt.mockImplementation((questions: any) => {
          const question = Array.isArray(questions) ? questions[0] : questions;

          if (question.message.includes('Select AI provider')) {
            expect(question.type).toBe('list');
            expect(question.name).toBe('value');
            expect(question.choices).toEqual([
              { name: 'OpenAI', value: 'openai' },
              { name: 'Anthropic (Claude)', value: 'anthropic' },
              { name: 'Google (Gemini)', value: 'google' },
            ]);
          }

          return Promise.resolve({ value: 'openai' });
        });

        await modelCommand();

        expect(mockInquirer.prompt).toHaveBeenCalledTimes(2);
      });

      test('should set current provider as default', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue([
          'openai',
          'anthropic',
        ]);
        mockConfigManager.getCurrentProvider.mockReturnValue('anthropic');

        mockInquirer.prompt.mockImplementation((questions: any) => {
          const question = Array.isArray(questions) ? questions[0] : questions;

          if (question.message.includes('Select AI provider')) {
            expect(question.default).toBe('anthropic');
          }

          return Promise.resolve({ value: 'anthropic' });
        });

        await modelCommand();
      });
    });

    describe('model selection', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);
        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );
      });

      test('should present models for selected provider', async () => {
        let promptCallCount = 0;
        mockInquirer.prompt.mockImplementation((questions: any) => {
          promptCallCount++;
          const question = Array.isArray(questions) ? questions[0] : questions;

          if (promptCallCount === 1) {
            return Promise.resolve({ value: 'openai' });
          } else if (promptCallCount === 2) {
            expect(question.type).toBe('list');
            expect(question.name).toBe('value');
            expect(question.message).toBe('Select model:');
            expect(question.choices).toEqual([
              'gpt-4o',
              'gpt-4o-mini',
              'gpt-4-turbo',
              'gpt-3.5-turbo',
            ]);
            return Promise.resolve({ value: 'gpt-4o' });
          }

          return Promise.resolve({ value: 'default' });
        });

        await modelCommand();

        expect(mockInquirer.prompt).toHaveBeenCalledTimes(2);
      });

      test('should use current model as default when compatible with provider', async () => {
        mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');

        let promptCallCount = 0;
        mockInquirer.prompt.mockImplementation((questions: any) => {
          promptCallCount++;
          const question = Array.isArray(questions) ? questions[0] : questions;

          if (promptCallCount === 1) {
            return Promise.resolve({ value: 'openai' });
          } else if (promptCallCount === 2) {
            expect(question.default).toBe('gpt-4o');
            return Promise.resolve({ value: 'gpt-4o' });
          }

          return Promise.resolve({ value: 'default' });
        });

        await modelCommand();
      });

      test('should use first model as default when current model is incompatible', async () => {
        mockConfigManager.getCurrentModel.mockReturnValue(
          'claude-3-5-haiku-20241022'
        ); // Anthropic model

        let promptCallCount = 0;
        mockInquirer.prompt.mockImplementation((questions: any) => {
          promptCallCount++;
          const question = Array.isArray(questions) ? questions[0] : questions;

          if (promptCallCount === 1) {
            return Promise.resolve({ value: 'openai' });
          } else if (promptCallCount === 2) {
            expect(question.default).toBe('gpt-4o'); // First OpenAI model
            return Promise.resolve({ value: 'gpt-4o' });
          }

          return Promise.resolve({ value: 'default' });
        });

        await modelCommand();
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);
        mockInquirer.__setMockResponses({ value: 'openai' });
      });

      test('should handle configuration save errors', async () => {
        const error = new Error('Failed to write configuration file');
        mockConfigManager.setCurrentProviderAndModel.mockRejectedValue(error);

        await modelCommand();

        expect(
          consoleErrors.some(log =>
            log.includes('Error updating model configuration:')
          )
        ).toBe(true);
        expect(
          consoleErrors.some(log =>
            log.includes('Failed to write configuration file')
          )
        ).toBe(true);
        expect(processExitCode).toBe(1);
      });

      test('should handle unknown errors', async () => {
        mockConfigManager.setCurrentProviderAndModel.mockRejectedValue(
          'Unknown error string'
        );

        await modelCommand();

        expect(
          consoleErrors.some(log =>
            log.includes('Error updating model configuration:')
          )
        ).toBe(true);
        expect(consoleErrors.some(log => log.includes('Unknown error'))).toBe(
          true
        );
        expect(processExitCode).toBe(1);
      });
    });

    describe('user interface', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);
        mockInquirer.__setMockResponses({ value: 'openai' });
        mockConfigManager.setCurrentProviderAndModel.mockResolvedValue(
          undefined
        );
      });

      test('should display welcome message', async () => {
        await modelCommand();

        expect(
          consoleLogs.some(log => log.includes('Configure AI model settings'))
        ).toBe(true);
      });
    });
  });

  describe('modelListCommand', () => {
    describe('no providers configured', () => {
      test('should handle no available providers without exiting', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue([]);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelListCommand();

        expect(
          consoleErrors.some(log => log.includes('No AI providers configured'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('Please set up API keys'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('OpenAI: OPENAI_API_KEY'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('Anthropic: ANTHROPIC_API_KEY'))
        ).toBe(true);
        expect(
          consoleLogs.some(log =>
            log.includes('Google: GOOGLE_GENERATIVE_AI_API_KEY')
          )
        ).toBe(true);
        expect(processExitCode).toBeUndefined(); // Should not exit
      });
    });

    describe('current model display', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
      });

      test('should display current model when configured', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue('openai');
        mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');

        await modelListCommand();

        expect(
          consoleLogs.some(log => log.includes('✓ Current: openai - gpt-4o'))
        ).toBe(true);
      });

      test('should display no model configured message when not set', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelListCommand();

        expect(
          consoleLogs.some(log => log.includes('⚠️  No model configured'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('Use "cgem model" to set one'))
        ).toBe(true);
      });

      test('should display no model configured when only provider is set', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue('openai');
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelListCommand();

        expect(
          consoleLogs.some(log => log.includes('⚠️  No model configured'))
        ).toBe(true);
      });

      test('should display no model configured when only model is set', async () => {
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o');

        await modelListCommand();

        expect(
          consoleLogs.some(log => log.includes('⚠️  No model configured'))
        ).toBe(true);
      });
    });

    describe('provider and model listing', () => {
      test('should list all available providers and models', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue([
          'openai',
          'anthropic',
          'google',
        ]);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelListCommand();

        expect(
          consoleLogs.some(log =>
            log.includes('Available providers and models:')
          )
        ).toBe(true);
        expect(consoleLogs.some(log => log.includes('• OpenAI:'))).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('• Anthropic (Claude):'))
        ).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('• Google (Gemini):'))
        ).toBe(true);

        // Check some models are listed
        expect(consoleLogs.some(log => log.includes('gpt-4o'))).toBe(true);
        expect(
          consoleLogs.some(log => log.includes('claude-3-5-haiku-20241022'))
        ).toBe(true);
        expect(consoleLogs.some(log => log.includes('gemini-1.5-flash'))).toBe(
          true
        );

        expect(
          consoleLogs.some(log => log.includes('Use "cgem model" to change'))
        ).toBe(true);
      });

      test('should highlight current model selection', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue([
          'openai',
          'anthropic',
        ]);
        mockConfigManager.getCurrentProvider.mockReturnValue('anthropic');
        mockConfigManager.getCurrentModel.mockReturnValue(
          'claude-3-5-sonnet-20241022'
        );

        await modelListCommand();

        // Current model should be highlighted
        expect(
          consoleLogs.some(log =>
            log.includes('✓ Current: anthropic - claude-3-5-sonnet-20241022')
          )
        ).toBe(true);

        // The specific model should also be marked in the list
        expect(
          consoleLogs.some(
            log =>
              log.includes('✓') && log.includes('claude-3-5-sonnet-20241022')
          )
        ).toBe(true);
      });

      test('should list single provider correctly', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['google']);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);

        await modelListCommand();

        expect(
          consoleLogs.some(log => log.includes('• Google (Gemini):'))
        ).toBe(true);
        expect(consoleLogs.some(log => log.includes('gemini-1.5-flash'))).toBe(
          true
        );
        expect(consoleLogs.some(log => log.includes('gemini-1.5-pro'))).toBe(
          true
        );
        expect(consoleLogs.some(log => log.includes('gemini-1.0-pro'))).toBe(
          true
        );

        // Should not contain other providers
        expect(consoleLogs.some(log => log.includes('• OpenAI:'))).toBe(false);
        expect(consoleLogs.some(log => log.includes('• Anthropic'))).toBe(
          false
        );
      });

      test('should handle partial provider availability', async () => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
        mockConfigManager.getCurrentProvider.mockReturnValue('openai');
        mockConfigManager.getCurrentModel.mockReturnValue('gpt-4o-mini');

        await modelListCommand();

        expect(
          consoleLogs.some(log =>
            log.includes('✓ Current: openai - gpt-4o-mini')
          )
        ).toBe(true);
        expect(consoleLogs.some(log => log.includes('• OpenAI:'))).toBe(true);

        // Should contain OpenAI models
        expect(consoleLogs.some(log => log.includes('gpt-4o'))).toBe(true);
        expect(consoleLogs.some(log => log.includes('gpt-4o-mini'))).toBe(true);
        expect(consoleLogs.some(log => log.includes('gpt-4-turbo'))).toBe(true);
        expect(consoleLogs.some(log => log.includes('gpt-3.5-turbo'))).toBe(
          true
        );

        // Should highlight current model
        expect(
          consoleLogs.some(
            log => log.includes('✓') && log.includes('gpt-4o-mini')
          )
        ).toBe(true);
      });
    });

    describe('user interface', () => {
      beforeEach(() => {
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
        mockConfigManager.getCurrentProvider.mockReturnValue(null);
        mockConfigManager.getCurrentModel.mockReturnValue(null);
      });

      test('should display welcome message', async () => {
        await modelListCommand();

        expect(
          consoleLogs.some(log => log.includes('🤖 Available AI models'))
        ).toBe(true);
      });

      test('should display usage instructions', async () => {
        await modelListCommand();

        expect(
          consoleLogs.some(log =>
            log.includes('Use "cgem model" to change your model selection')
          )
        ).toBe(true);
      });
    });

    describe('edge cases', () => {
      test('should handle current model that is not in available models', async () => {
        // This could happen if a provider was removed or models changed
        mockConfigManager.getAvailableProviders.mockReturnValue(['openai']);
        mockConfigManager.getCurrentProvider.mockReturnValue('anthropic'); // Not available
        mockConfigManager.getCurrentModel.mockReturnValue(
          'claude-3-5-sonnet-20241022'
        );

        await modelListCommand();

        // Should still show as current, even if provider not available
        expect(
          consoleLogs.some(log =>
            log.includes('✓ Current: anthropic - claude-3-5-sonnet-20241022')
          )
        ).toBe(true);

        // But should only list available providers
        expect(consoleLogs.some(log => log.includes('• OpenAI:'))).toBe(true);
        expect(consoleLogs.some(log => log.includes('• Anthropic'))).toBe(
          false
        );
      });
    });
  });
});
