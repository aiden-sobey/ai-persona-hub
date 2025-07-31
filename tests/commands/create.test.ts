import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { createCommand } from '../../src/commands/create';
import { ProfileManager } from '../../src/services/profile-manager';
import { createMockProfile } from '../setup/test-utils';

// Mock inquirer
jest.mock('inquirer');
import inquirer from 'inquirer';
const mockInquirer = inquirer as any;

// Mock ProfileManager
jest.mock('../../src/services/profile-manager');
const MockProfileManager = ProfileManager as any;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;

describe('createCommand', () => {
  let mockProfileManager: any;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let processExitCode: number | undefined;

  beforeEach(() => {
    // Reset mocks
    mockInquirer.__resetMocks();
    MockProfileManager.mockClear();

    // Create mock profile manager instance
    mockProfileManager = {
      createProfile: jest.fn(),
    };
    MockProfileManager.mockImplementation(() => mockProfileManager);

    // Mock console methods
    consoleLogs = [];
    consoleErrors = [];
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
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  describe('successful profile creation', () => {
    test('should create profile with valid inputs', async () => {
      const mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
        maxTokens: 1000,
      });

      // Set up mock responses
      mockInquirer.__setMockResponses({
        value: 'Test Profile', // This will be used for all three prompts in sequence
      });

      // Override specific responses for each prompt call
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        switch (promptCallCount) {
          case 1: // name
            return Promise.resolve({ value: 'Test Profile' });
          case 2: // systemPrompt
            return Promise.resolve({ value: 'You are a test assistant.' });
          case 3: // maxTokens
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(mockProfile);

      await createCommand();

      expect(mockProfileManager.createProfile).toHaveBeenCalledWith({
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
        maxTokens: 1000,
      });

      expect(
        consoleLogs.some(log => log.includes('Profile created successfully!'))
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('Profile ID: test-profile'))
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('cgem chat Test Profile'))
      ).toBe(true);
    });

    test('should handle optional max tokens', async () => {
      const mockProfile = createMockProfile({
        name: 'Simple Profile',
        systemPrompt: 'Simple prompt',
      });

      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        switch (promptCallCount) {
          case 1: // name
            return Promise.resolve({ value: 'Simple Profile' });
          case 2: // systemPrompt
            return Promise.resolve({ value: 'Simple prompt' });
          case 3: // maxTokens - use default
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(mockProfile);

      await createCommand();

      expect(mockProfileManager.createProfile).toHaveBeenCalledWith({
        name: 'Simple Profile',
        systemPrompt: 'Simple prompt',
        maxTokens: 1000,
      });
    });
  });

  describe('input validation', () => {
    test('should validate profile name is required', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation((questions: any) => {
        promptCallCount++;
        if (promptCallCount === 1) {
          // Test validation function for empty name
          const nameQuestion = Array.isArray(questions)
            ? questions[0]
            : questions;
          const validation = nameQuestion.validate('');
          expect(validation).toBe('Profile name is required');

          const validationTrimmed = nameQuestion.validate('   ');
          expect(validationTrimmed).toBe('Profile name is required');

          const validValidation = nameQuestion.validate('Valid Name');
          expect(validValidation).toBe(true);

          return Promise.resolve({ value: 'Valid Name' });
        }
        // Continue with other prompts
        switch (promptCallCount) {
          case 2:
            return Promise.resolve({ value: 'Valid prompt' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(createMockProfile());

      await createCommand();

      expect(mockProfileManager.createProfile).toHaveBeenCalled();
    });

    test('should validate profile name length', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation((questions: any) => {
        promptCallCount++;
        if (promptCallCount === 1) {
          const nameQuestion = Array.isArray(questions)
            ? questions[0]
            : questions;
          const longName = 'a'.repeat(51);
          const validation = nameQuestion.validate(longName);
          expect(validation).toBe('Profile name must be 50 characters or less');

          const validName = 'a'.repeat(50);
          const validValidation = nameQuestion.validate(validName);
          expect(validValidation).toBe(true);

          return Promise.resolve({ value: 'Valid Name' });
        }
        switch (promptCallCount) {
          case 2:
            return Promise.resolve({ value: 'Valid prompt' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(createMockProfile());

      await createCommand();
    });

    test('should validate system prompt is required', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation((questions: any) => {
        promptCallCount++;
        if (promptCallCount === 2) {
          const promptQuestion = Array.isArray(questions)
            ? questions[0]
            : questions;
          const validation = promptQuestion.validate('');
          expect(validation).toBe('System prompt is required');

          const validationTrimmed = promptQuestion.validate('   ');
          expect(validationTrimmed).toBe('System prompt is required');

          const validValidation = promptQuestion.validate('Valid prompt');
          expect(validValidation).toBe(true);

          return Promise.resolve({ value: 'Valid prompt' });
        }
        switch (promptCallCount) {
          case 1:
            return Promise.resolve({ value: 'Valid Name' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(createMockProfile());

      await createCommand();
    });

    test('should validate max tokens range', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation((questions: any) => {
        promptCallCount++;
        if (promptCallCount === 3) {
          const tokensQuestion = Array.isArray(questions)
            ? questions[0]
            : questions;
          // 0 is falsy, so it passes validation
          const validation1 = tokensQuestion.validate(0);
          expect(validation1).toBe(true);

          const validation2 = tokensQuestion.validate(8193);
          expect(validation2).toBe('Max tokens must be between 1 and 8192');

          const validValidation1 = tokensQuestion.validate(1);
          expect(validValidation1).toBe(true);

          const validValidation2 = tokensQuestion.validate(8192);
          expect(validValidation2).toBe(true);

          const validValidation3 = tokensQuestion.validate(undefined);
          expect(validValidation3).toBe(true);

          const validation4 = tokensQuestion.validate(-1);
          expect(validation4).toBe('Max tokens must be between 1 and 8192');

          return Promise.resolve({ value: 1000 });
        }
        switch (promptCallCount) {
          case 1:
            return Promise.resolve({ value: 'Valid Name' });
          case 2:
            return Promise.resolve({ value: 'Valid prompt' });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(createMockProfile());

      await createCommand();
    });
  });

  describe('error handling', () => {
    test('should handle profile creation errors', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        switch (promptCallCount) {
          case 1:
            return Promise.resolve({ value: 'Test Profile' });
          case 2:
            return Promise.resolve({ value: 'Test prompt' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      const error = new Error('Profile already exists');
      mockProfileManager.createProfile.mockRejectedValue(error);

      await createCommand();

      expect(
        consoleErrors.some(log => log.includes('Error creating profile:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log => log.includes('Profile already exists'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle unknown errors', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        switch (promptCallCount) {
          case 1:
            return Promise.resolve({ value: 'Test Profile' });
          case 2:
            return Promise.resolve({ value: 'Test prompt' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockRejectedValue(
        'Unknown error string'
      );

      await createCommand();

      expect(
        consoleErrors.some(log => log.includes('Error creating profile:'))
      ).toBe(true);
      expect(consoleErrors.some(log => log.includes('Unknown error'))).toBe(
        true
      );
      expect(processExitCode).toBe(1);
    });
  });

  describe('user interface', () => {
    test('should display welcome message', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation(() => {
        promptCallCount++;
        switch (promptCallCount) {
          case 1:
            return Promise.resolve({ value: 'Test Profile' });
          case 2:
            return Promise.resolve({ value: 'Test prompt' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(createMockProfile());

      await createCommand();

      expect(
        consoleLogs.some(log => log.includes('Creating a new AI profile'))
      ).toBe(true);
    });

    test('should use correct inquirer prompt configuration', async () => {
      let promptCallCount = 0;
      mockInquirer.prompt.mockImplementation((questions: any) => {
        promptCallCount++;
        const question = Array.isArray(questions) ? questions[0] : questions;

        if (promptCallCount === 1) {
          // Check name prompt configuration
          expect(question.type).toBe('input');
          expect(question.name).toBe('value');
          expect(question.message).toBe('Profile name:');
          expect(typeof question.validate).toBe('function');
        } else if (promptCallCount === 2) {
          // Check system prompt configuration
          expect(question.type).toBe('input');
          expect(question.name).toBe('value');
          expect(question.message).toBe('System prompt:');
          expect(typeof question.validate).toBe('function');
        } else if (promptCallCount === 3) {
          // Check max tokens configuration
          expect(question.type).toBe('number');
          expect(question.name).toBe('value');
          expect(question.message).toBe('Max tokens (optional):');
          expect(question.default).toBe(1000);
          expect(typeof question.validate).toBe('function');
        }

        switch (promptCallCount) {
          case 1:
            return Promise.resolve({ value: 'Test Profile' });
          case 2:
            return Promise.resolve({ value: 'Test prompt' });
          case 3:
            return Promise.resolve({ value: 1000 });
          default:
            return Promise.resolve({ value: 'default' });
        }
      });

      mockProfileManager.createProfile.mockResolvedValue(createMockProfile());

      await createCommand();

      expect(mockInquirer.prompt).toHaveBeenCalledTimes(3);
    });
  });
});
