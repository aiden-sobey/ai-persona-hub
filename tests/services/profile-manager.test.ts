import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ProfileManager } from '../../src/services/profile-manager';
import { AIProfile } from '../../src/types';
import { createMockProfile, createMockProfiles } from '../setup/test-utils';

// Mock fs module
jest.mock('fs');
import * as fs from 'fs';
const mockFs = fs as any;

describe('ProfileManager', () => {
  let profileManager: ProfileManager;
  const testProfilesDir = '/test/profiles';
  const indexPath = '/test/profiles/index.json';

  beforeEach(() => {
    // Reset mocks
    mockFs.__resetMocks();
    
    // Set up default file system state
    mockFs.__setMockDirectories([testProfilesDir]);
    mockFs.__setMockFiles({
      [indexPath]: JSON.stringify({ profiles: [] }),
    });
    
    profileManager = new ProfileManager(testProfilesDir);
  });

  afterEach(() => {
    mockFs.__resetMocks();
  });

  describe('constructor', () => {
    test('should create profiles directory if it does not exist', () => {
      mockFs.__clearMockFileSystem();
      
      new ProfileManager(testProfilesDir);
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(testProfilesDir, { recursive: true });
    });

    test('should create index.json if it does not exist', () => {
      mockFs.__setMockDirectories([testProfilesDir]);
      mockFs.__setMockFiles({}); // No index file
      
      new ProfileManager(testProfilesDir);
      
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        indexPath,
        JSON.stringify({ profiles: [] }, null, 2)
      );
    });

    test('should not create index.json if it already exists', () => {
      new ProfileManager(testProfilesDir);
      
      // writeFileSync should only be called once during setup, not again
      expect(fs.writeFileSync).toHaveBeenCalledTimes(0);
    });
  });

  describe('createProfile', () => {
    test('should create a new profile successfully', async () => {
      const profileData = {
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
        maxTokens: 1000,
      };

      const result = await profileManager.createProfile(profileData);

      expect(result).toMatchObject({
        id: 'test-profile',
        name: 'Test Profile',
        systemPrompt: 'You are a test assistant.',
        maxTokens: 1000,
      });
      expect(result.createdAt).toBeDefined();
      expect(typeof result.createdAt).toBe('string');

      // Check that profile file was written
      const profilePath = '/test/profiles/test-profile.json';
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        profilePath,
        expect.stringContaining('"name": "Test Profile"')
      );

      // Check that index was updated
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        indexPath,
        JSON.stringify({ profiles: ['test-profile'] }, null, 2)
      );
    });

    test('should sanitize profile names', async () => {
      const profileData = {
        name: 'Test Profile With Spaces & Special!',
        systemPrompt: 'Test prompt',
      };

      const result = await profileManager.createProfile(profileData);

      expect(result.id).toBe('test-profile-with-spaces---special-');
    });

    test('should throw error if profile already exists', async () => {
      const profilePath = '/test/profiles/existing-profile.json';
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: [] }),
        [profilePath]: JSON.stringify(createMockProfile({ id: 'existing-profile' })),
      });

      const profileData = {
        name: 'Existing Profile',
        systemPrompt: 'Test prompt',
      };

      await expect(profileManager.createProfile(profileData)).rejects.toThrow(
        "Profile 'Existing Profile' already exists"
      );
    });
  });

  describe('getProfile', () => {
    test('should return profile if it exists', async () => {
      const mockProfile = createMockProfile({ id: 'existing-profile' });
      const profilePath = '/test/profiles/existing-profile.json';
      
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: [] }),
        [profilePath]: JSON.stringify(mockProfile),
      });

      const result = await profileManager.getProfile('existing-profile');

      expect(result).toEqual(mockProfile);
      expect(fs.readFileSync).toHaveBeenCalledWith(profilePath, 'utf-8');
    });

    test('should return null if profile does not exist', async () => {
      const result = await profileManager.getProfile('non-existent');

      expect(result).toBeNull();
    });

    test('should return null if profile file is corrupted', async () => {
      const profilePath = '/test/profiles/corrupted-profile.json';
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: [] }),
        [profilePath]: 'invalid json{',
      });

      const result = await profileManager.getProfile('corrupted-profile');

      expect(result).toBeNull();
    });

    test('should sanitize profile name for lookup', async () => {
      const mockProfile = createMockProfile({ id: 'test-profile' });
      const profilePath = '/test/profiles/test-profile.json';
      
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: [] }),
        [profilePath]: JSON.stringify(mockProfile),
      });

      const result = await profileManager.getProfile('Test Profile');

      expect(result).toEqual(mockProfile);
    });
  });

  describe('listProfiles', () => {
    test('should return empty array when no profiles exist', async () => {
      const result = await profileManager.listProfiles();

      expect(result).toEqual([]);
    });

    test('should return all profiles sorted by name', async () => {
      const profiles = createMockProfiles(3);
      profiles[0].name = 'Charlie';
      profiles[1].name = 'Alice';
      profiles[2].name = 'Bob';

      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: ['profile-1', 'profile-2', 'profile-3'] }),
        '/test/profiles/profile-1.json': JSON.stringify(profiles[0]),
        '/test/profiles/profile-2.json': JSON.stringify(profiles[1]),
        '/test/profiles/profile-3.json': JSON.stringify(profiles[2]),
      });

      const result = await profileManager.listProfiles();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    test('should skip profiles that cannot be loaded', async () => {
      const validProfile = createMockProfile({ id: 'valid-profile' });

      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: ['valid-profile', 'invalid-profile'] }),
        '/test/profiles/valid-profile.json': JSON.stringify(validProfile),
        // invalid-profile.json doesn't exist
      });

      const result = await profileManager.listProfiles();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validProfile);
    });

    test('should handle corrupted index file', async () => {
      mockFs.__setMockFiles({
        [indexPath]: 'invalid json{',
      });

      const result = await profileManager.listProfiles();

      expect(result).toEqual([]);
    });
  });

  describe('updateProfile', () => {
    test('should update existing profile', async () => {
      const originalProfile = createMockProfile({ id: 'test-profile' });
      const profilePath = '/test/profiles/test-profile.json';
      
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: [] }),
        [profilePath]: JSON.stringify(originalProfile),
      });

      const updates = {
        systemPrompt: 'Updated prompt',
        maxTokens: 2000,
      };

      const result = await profileManager.updateProfile('test-profile', updates);

      expect(result).toMatchObject({
        ...originalProfile,
        systemPrompt: 'Updated prompt',
        maxTokens: 2000,
      });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        profilePath,
        expect.stringContaining('"systemPrompt": "Updated prompt"')
      );
    });

    test('should return null if profile does not exist', async () => {
      const result = await profileManager.updateProfile('non-existent', {
        systemPrompt: 'New prompt',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    test('should delete existing profile', async () => {
      const profilePath = '/test/profiles/test-profile.json';
      
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: ['test-profile'] }),
        [profilePath]: JSON.stringify(createMockProfile()),
      });

      const result = await profileManager.deleteProfile('test-profile');

      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledWith(profilePath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        indexPath,
        JSON.stringify({ profiles: [] }, null, 2)
      );
    });

    test('should return false if profile does not exist', async () => {
      const result = await profileManager.deleteProfile('non-existent');

      expect(result).toBe(false);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    test('should throw error if file deletion fails', async () => {
      const profilePath = '/test/profiles/test-profile.json';
      
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: ['test-profile', 'other-profile'] }),
        [profilePath]: JSON.stringify(createMockProfile()),
      });

      // Mock unlinkSync to throw an error
      (fs.unlinkSync as jest.MockedFunction<typeof fs.unlinkSync>).mockImplementationOnce(() => {
        throw new Error('Permission denied');
      });

      await expect(profileManager.deleteProfile('test-profile')).rejects.toThrow('Permission denied');

      // Index should NOT be updated if file deletion fails
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(
        indexPath,
        JSON.stringify({ profiles: ['other-profile'] }, null, 2)
      );
    });
  });

  describe('updateLastUsed', () => {
    test('should update lastUsed timestamp', async () => {
      const originalProfile = createMockProfile({ id: 'test-profile' });
      const profilePath = '/test/profiles/test-profile.json';
      
      mockFs.__setMockFiles({
        [indexPath]: JSON.stringify({ profiles: [] }),
        [profilePath]: JSON.stringify(originalProfile),
      });

      const beforeUpdate = new Date().toISOString();
      await profileManager.updateLastUsed('test-profile');
      const afterUpdate = new Date().toISOString();

      // Verify that writeFileSync was called
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        profilePath,
        expect.stringContaining('"lastUsed"')
      );

      // Get the written data and parse it to check the timestamp
      const writeCall = (fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>).mock.calls.find(
        call => call[0] === profilePath
      );
      expect(writeCall).toBeDefined();
      
      const writtenData = JSON.parse(writeCall![1] as string);
      expect(writtenData.lastUsed).toBeDefined();
      expect(new Date(writtenData.lastUsed).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime());
      expect(new Date(writtenData.lastUsed).getTime()).toBeLessThanOrEqual(new Date(afterUpdate).getTime());
    });
  });
});