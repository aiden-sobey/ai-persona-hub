import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { listCommand } from '../../src/commands/list';
import { ProfileManager } from '../../src/services/profile-manager';
import { createMockProfile, _createMockProfiles } from '../setup/test-utils';

// Mock ProfileManager
jest.mock('../../src/services/profile-manager');
const MockProfileManager = ProfileManager as any;

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalProcessExit = process.exit;

describe('listCommand', () => {
  let mockProfileManager: any;
  let consoleLogs: string[];
  let consoleErrors: string[];
  let processExitCode: number | undefined;

  beforeEach(() => {
    // Reset mocks
    MockProfileManager.mockClear();

    // Create mock profile manager instance
    mockProfileManager = {
      listProfiles: jest.fn(),
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

  describe('no profiles found', () => {
    test('should display helpful message when no profiles exist', async () => {
      mockProfileManager.listProfiles.mockResolvedValue([]);

      await listCommand();

      expect(mockProfileManager.listProfiles).toHaveBeenCalled();
      expect(consoleLogs.some(log => log.includes('No profiles found'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('cgem create'))).toBe(true);
    });
  });

  describe('profiles listing', () => {
    test('should display single profile correctly', async () => {
      const mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a helpful test assistant.',
        maxTokens: 1000,
        createdAt: '2024-01-15T10:00:00.000Z',
        lastUsed: '2024-01-16T14:30:00.000Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(
        consoleLogs.some(log => log.includes('Available profiles (1)'))
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('• Test Profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('ID: test-profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('Created: 1/15/2024'))).toBe(
        true
      );
      expect(
        consoleLogs.some(log => log.includes('Last used: 1/16/2024'))
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('Max tokens: 1000'))).toBe(
        true
      );
      expect(
        consoleLogs.some(log =>
          log.includes('Prompt: You are a helpful test assistant.')
        )
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('cgem chat <profile-name>'))
      ).toBe(true);
    });

    test('should display multiple profiles', async () => {
      const profiles = [
        createMockProfile({
          id: 'profile-1',
          name: 'Profile One',
          systemPrompt: 'First profile',
          createdAt: '2024-01-15T10:00:00.000Z',
        }),
        createMockProfile({
          id: 'profile-2',
          name: 'Profile Two',
          systemPrompt: 'Second profile',
          createdAt: '2024-01-16T10:00:00.000Z',
        }),
      ];

      mockProfileManager.listProfiles.mockResolvedValue(profiles);

      await listCommand();

      expect(
        consoleLogs.some(log => log.includes('Available profiles (2)'))
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('• Profile One'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('• Profile Two'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('ID: profile-1'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('ID: profile-2'))).toBe(true);
    });

    test('should handle profile without optional fields', async () => {
      const mockProfile = createMockProfile({
        id: 'minimal-profile',
        name: 'Minimal Profile',
        systemPrompt: 'Basic prompt',
        createdAt: '2024-01-15T10:00:00.000Z',
        // No lastUsed or maxTokens
      });

      // Remove optional fields
      delete (mockProfile as any).lastUsed;
      delete (mockProfile as any).maxTokens;

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(consoleLogs.some(log => log.includes('• Minimal Profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('ID: minimal-profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('Created: 1/15/2024'))).toBe(
        true
      );
      expect(
        consoleLogs.some(log => log.includes('Prompt: Basic prompt'))
      ).toBe(true);

      // Should not contain optional fields
      expect(consoleLogs.some(log => log.includes('Last used:'))).toBe(false);
      expect(consoleLogs.some(log => log.includes('Max tokens:'))).toBe(false);
    });

    test('should truncate long system prompts', async () => {
      const longPrompt =
        'This is a very long system prompt that exceeds 100 characters and should be truncated with ellipsis to make it more readable in the list view';
      const mockProfile = createMockProfile({
        id: 'long-prompt-profile',
        name: 'Long Prompt Profile',
        systemPrompt: longPrompt,
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(
        consoleLogs.some(log =>
          log.includes(
            'Prompt: This is a very long system prompt that exceeds 100 characters and should be truncated with elli...'
          )
        )
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes(longPrompt))).toBe(false);
    });

    test('should not truncate short system prompts', async () => {
      const shortPrompt = 'Short prompt';
      const mockProfile = createMockProfile({
        id: 'short-prompt-profile',
        name: 'Short Prompt Profile',
        systemPrompt: shortPrompt,
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(
        consoleLogs.some(log => log.includes(`Prompt: ${shortPrompt}`))
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('...'))).toBe(false);
    });

    test('should format dates correctly', async () => {
      const mockProfile = createMockProfile({
        id: 'date-test-profile',
        name: 'Date Test Profile',
        systemPrompt: 'Test prompt',
        createdAt: '2024-12-25T15:30:45.123Z',
        lastUsed: '2024-12-31T23:59:59.999Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(consoleLogs.some(log => log.includes('Created: 12/25/2024'))).toBe(
        true
      );
      expect(
        consoleLogs.some(log => log.includes('Last used: 12/31/2024'))
      ).toBe(true);
    });

    test('should handle profiles with maxTokens = 0', async () => {
      const mockProfile = createMockProfile({
        id: 'zero-tokens-profile',
        name: 'Zero Tokens Profile',
        systemPrompt: 'Test prompt',
        maxTokens: 0,
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      // maxTokens is 0, which is falsy, so should not be displayed
      expect(consoleLogs.some(log => log.includes('Max tokens:'))).toBe(false);
    });

    test('should display usage instructions', async () => {
      const mockProfile = createMockProfile();
      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(
        consoleLogs.some(log => log.includes('Start a conversation with:'))
      ).toBe(true);
      expect(
        consoleLogs.some(log => log.includes('cgem chat <profile-name>'))
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle ProfileManager errors', async () => {
      const error = new Error('Failed to read profiles directory');
      mockProfileManager.listProfiles.mockRejectedValue(error);

      await listCommand();

      expect(
        consoleErrors.some(log => log.includes('Error listing profiles:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log =>
          log.includes('Failed to read profiles directory')
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle unknown errors', async () => {
      mockProfileManager.listProfiles.mockRejectedValue('Unknown error string');

      await listCommand();

      expect(
        consoleErrors.some(log => log.includes('Error listing profiles:'))
      ).toBe(true);
      expect(consoleErrors.some(log => log.includes('Unknown error'))).toBe(
        true
      );
      expect(processExitCode).toBe(1);
    });

    test('should handle null/undefined profiles', async () => {
      // This shouldn't happen in practice, but let's test defensive behavior
      mockProfileManager.listProfiles.mockResolvedValue(null);

      await expect(listCommand()).rejects.toThrow();
    });
  });

  describe('profile ordering and formatting', () => {
    test('should respect profile ordering returned by ProfileManager', async () => {
      const profiles = [
        createMockProfile({
          id: 'profile-z',
          name: 'Z Profile',
          systemPrompt: 'Last alphabetically',
          createdAt: '2024-01-15T10:00:00.000Z',
        }),
        createMockProfile({
          id: 'profile-a',
          name: 'A Profile',
          systemPrompt: 'First alphabetically',
          createdAt: '2024-01-16T10:00:00.000Z',
        }),
      ];

      mockProfileManager.listProfiles.mockResolvedValue(profiles);

      await listCommand();

      const profileNames = consoleLogs
        .filter(log => log.includes('•'))
        .map(log => log.trim());
      expect(profileNames[0]).toContain('Z Profile');
      expect(profileNames[1]).toContain('A Profile');
    });

    test('should handle profiles with special characters in names', async () => {
      const mockProfile = createMockProfile({
        id: 'special-chars-profile',
        name: 'Profile with "quotes" & special chars!',
        systemPrompt: 'Special chars test',
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(
        consoleLogs.some(log =>
          log.includes('• Profile with "quotes" & special chars!')
        )
      ).toBe(true);
    });

    test('should handle empty string fields gracefully', async () => {
      const mockProfile = createMockProfile({
        id: 'empty-fields-profile',
        name: 'Empty Fields Profile',
        systemPrompt: '', // Empty system prompt
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.listProfiles.mockResolvedValue([mockProfile]);

      await listCommand();

      expect(
        consoleLogs.some(log => log.includes('• Empty Fields Profile'))
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('Prompt: '))).toBe(true);
    });
  });
});
