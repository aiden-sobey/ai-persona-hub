import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { deleteCommand } from '../../src/commands/delete';
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

describe('deleteCommand', () => {
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
      getProfile: jest.fn(),
      deleteProfile: jest.fn(),
    };
    MockProfileManager.mockImplementation(() => mockProfileManager);

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
      throw new Error(`MOCK_EXIT_${code || 0}`);
    });
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  describe('parameter validation', () => {
    test('should handle missing profile name', async () => {
      await expect(deleteCommand('')).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(
        consoleLogs.some(log =>
          log.includes('Usage: cgem delete <profile-name>')
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
      expect(mockProfileManager.getProfile).not.toHaveBeenCalled();
    });

    test('should handle null profile name', async () => {
      await expect(deleteCommand(null as any)).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle undefined profile name', async () => {
      await expect(deleteCommand(undefined as any)).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });
  });

  describe('profile lookup', () => {
    test('should handle profile not found', async () => {
      mockProfileManager.getProfile.mockResolvedValue(null);

      await expect(deleteCommand('non-existent-profile')).rejects.toThrow('MOCK_EXIT_1');

      expect(mockProfileManager.getProfile).toHaveBeenCalledWith(
        'non-existent-profile'
      );
      expect(
        consoleErrors.some(log =>
          log.includes("Profile 'non-existent-profile' not found")
        )
      ).toBe(true);
      expect(processExitCode).toBe(1);
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    test('should proceed when profile is found', async () => {
      const mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'Test prompt',
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: false }); // Cancel deletion

      await deleteCommand('Test Profile');

      expect(mockProfileManager.getProfile).toHaveBeenCalledWith(
        'Test Profile'
      );
      expect(mockInquirer.prompt).toHaveBeenCalled();
    });
  });

  describe('profile information display', () => {
    test('should display profile information with all fields', async () => {
      const mockProfile = createMockProfile({
        id: 'full-profile',
        name: 'Full Profile',
        systemPrompt: 'Complete profile',
        maxTokens: 2000,
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: false });

      await deleteCommand('Full Profile');

      expect(
        consoleLogs.some(log =>
          log.includes('You are about to delete the profile:')
        )
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('Name: Full Profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('ID: full-profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('Created:'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('2024'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Max tokens: 2000'))).toBe(
        true
      );
    });

    test('should display profile information without optional fields', async () => {
      const mockProfile = createMockProfile({
        id: 'minimal-profile',
        name: 'Minimal Profile',
        systemPrompt: 'Basic profile',
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      // Remove optional fields
      delete (mockProfile as any).maxTokens;

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: false });

      await deleteCommand('Minimal Profile');

      expect(
        consoleLogs.some(log => log.includes('Name: Minimal Profile'))
      ).toBe(true);
      expect(consoleLogs.some(log => log.includes('ID: minimal-profile'))).toBe(
        true
      );
      expect(consoleLogs.some(log => log.includes('Created:'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('2024'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('Max tokens:'))).toBe(false);
    });

    test('should handle profile with maxTokens = 0', async () => {
      const mockProfile = createMockProfile({
        id: 'zero-tokens-profile',
        name: 'Zero Tokens Profile',
        systemPrompt: 'No tokens profile',
        maxTokens: 0,
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: false });

      await deleteCommand('Zero Tokens Profile');

      // maxTokens is 0, which is falsy, so should not be displayed
      expect(consoleLogs.some(log => log.includes('Max tokens:'))).toBe(false);
    });
  });

  describe('confirmation prompt', () => {
    let mockProfile: any;

    beforeEach(() => {
      mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'Test prompt',
        createdAt: '2024-01-15T10:00:00.000Z',
      });
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
    });

    test('should use correct confirmation prompt configuration', async () => {
      mockInquirer.prompt.mockImplementation((questions: any) => {
        const question = Array.isArray(questions) ? questions[0] : questions;

        expect(question.type).toBe('confirm');
        expect(question.name).toBe('confirmed');
        expect(question.message).toBe(
          'Are you sure you want to delete this profile?'
        );
        expect(question.default).toBe(false);

        return Promise.resolve({ confirmed: false });
      });

      await deleteCommand('Test Profile');

      expect(mockInquirer.prompt).toHaveBeenCalled();
    });

    test('should cancel deletion when user declines', async () => {
      mockInquirer.__setMockResponses({ confirmed: false });

      await deleteCommand('Test Profile');

      expect(consoleLogs.some(log => log.includes('Deletion cancelled.'))).toBe(
        true
      );
      expect(mockProfileManager.deleteProfile).not.toHaveBeenCalled();
      expect(processExitCode).toBeUndefined();
    });

    test('should proceed with deletion when user confirms', async () => {
      mockInquirer.__setMockResponses({ confirmed: true });
      mockProfileManager.deleteProfile.mockResolvedValue(true);

      await deleteCommand('Test Profile');

      expect(mockProfileManager.deleteProfile).toHaveBeenCalledWith(
        'Test Profile'
      );
      expect(
        consoleLogs.some(log =>
          log.includes("Profile 'Test Profile' deleted successfully")
        )
      ).toBe(true);
    });
  });

  describe('deletion process', () => {
    let mockProfile: any;

    beforeEach(() => {
      mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'Test prompt',
        createdAt: '2024-01-15T10:00:00.000Z',
      });
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: true });
    });

    test('should successfully delete profile', async () => {
      mockProfileManager.deleteProfile.mockResolvedValue(true);

      await deleteCommand('Test Profile');

      expect(mockProfileManager.deleteProfile).toHaveBeenCalledWith(
        'Test Profile'
      );
      expect(
        consoleLogs.some(log =>
          log.includes("Profile 'Test Profile' deleted successfully")
        )
      ).toBe(true);
      expect(processExitCode).toBeUndefined();
    });

    test('should handle deletion failure', async () => {
      mockProfileManager.deleteProfile.mockResolvedValue(false);

      await expect(deleteCommand('Test Profile')).rejects.toThrow('MOCK_EXIT_1');

      expect(mockProfileManager.deleteProfile).toHaveBeenCalledWith(
        'Test Profile'
      );
      expect(
        consoleErrors.some(log => log.includes('Failed to delete profile'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should use profile name from loaded profile object', async () => {
      // Test that success message uses the actual profile name, not the input parameter
      const mockProfile = createMockProfile({
        id: 'test-profile',
        name: 'Actual Profile Name',
        systemPrompt: 'Test prompt',
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockProfileManager.deleteProfile.mockResolvedValue(true);

      await deleteCommand('test-profile'); // Using ID instead of name

      expect(
        consoleLogs.some(log =>
          log.includes("Profile 'Actual Profile Name' deleted successfully")
        )
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle ProfileManager.getProfile errors', async () => {
      const error = new Error('Failed to read profile file');
      mockProfileManager.getProfile.mockRejectedValue(error);

      await expect(deleteCommand('Test Profile')).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Error deleting profile:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log => log.includes('Failed to read profile file'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle ProfileManager.deleteProfile errors', async () => {
      const mockProfile = createMockProfile();
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: true });

      const error = new Error('Permission denied');
      mockProfileManager.deleteProfile.mockRejectedValue(error);

      await expect(deleteCommand('Test Profile')).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Error deleting profile:'))
      ).toBe(true);
      expect(consoleErrors.some(log => log.includes('Permission denied'))).toBe(
        true
      );
      expect(processExitCode).toBe(1);
    });

    test('should handle inquirer errors', async () => {
      const mockProfile = createMockProfile();
      mockProfileManager.getProfile.mockResolvedValue(mockProfile);

      const error = new Error('Inquirer prompt failed');
      mockInquirer.prompt.mockRejectedValue(error);

      await expect(deleteCommand('Test Profile')).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Error deleting profile:'))
      ).toBe(true);
      expect(
        consoleErrors.some(log => log.includes('Inquirer prompt failed'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });

    test('should handle unknown errors', async () => {
      mockProfileManager.getProfile.mockRejectedValue('Unknown error string');

      await expect(deleteCommand('Test Profile')).rejects.toThrow('MOCK_EXIT_1');

      expect(
        consoleErrors.some(log => log.includes('Error deleting profile:'))
      ).toBe(true);
      expect(consoleErrors.some(log => log.includes('Unknown error'))).toBe(
        true
      );
      expect(processExitCode).toBe(1);
    });
  });

  describe('date formatting', () => {
    test('should format creation date correctly', async () => {
      const mockProfile = createMockProfile({
        id: 'date-test-profile',
        name: 'Date Test Profile',
        systemPrompt: 'Test prompt',
        createdAt: '2024-12-25T15:30:45.123Z',
      });

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: false });

      await deleteCommand('Date Test Profile');

      expect(consoleLogs.some(log => log.includes('Created:'))).toBe(true);
      expect(consoleLogs.some(log => log.includes('2024'))).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle profile with special characters in name', async () => {
      const mockProfile = createMockProfile({
        id: 'special-chars-profile',
        name: 'Profile with "quotes" & special chars!',
        systemPrompt: 'Test prompt',
        createdAt: '2024-01-15T10:00:00.000Z',
      });

      mockProfileManager.getProfile.mockResolvedValue(mockProfile);
      mockInquirer.__setMockResponses({ confirmed: true });
      mockProfileManager.deleteProfile.mockResolvedValue(true);

      await deleteCommand('special-profile');

      expect(
        consoleLogs.some(log =>
          log.includes('Name: Profile with "quotes" & special chars!')
        )
      ).toBe(true);
      expect(
        consoleLogs.some(log =>
          log.includes(
            'Profile \'Profile with "quotes" & special chars!\' deleted successfully'
          )
        )
      ).toBe(true);
    });

    test('should handle empty profile name parameter after normalization', async () => {
      await expect(deleteCommand('   ')).rejects.toThrow('MOCK_EXIT_1'); // Whitespace-only

      expect(
        consoleErrors.some(log => log.includes('Profile name is required'))
      ).toBe(true);
      expect(processExitCode).toBe(1);
    });
  });
});
