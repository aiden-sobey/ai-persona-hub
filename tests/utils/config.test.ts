import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ConfigManager } from '../../src/utils/config';
import { _AIProvider } from '../../src/types';
import { createMockConfig } from '../setup/test-utils';

// Mock fs and os modules
jest.mock('fs');
jest.mock('os', () => ({
  homedir: () => '/mock/home',
}));
jest.mock('path', () => ({
  join: (...paths: string[]) => paths.join('/'),
  resolve: (path: string) => path,
  dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
}));

import * as fs from 'fs';
const mockFs = fs as any;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;
  const configPath = '/mock/home/.cgem/config.json';

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Reset mocks
    mockFs.__resetMocks();

    // Set up default file system state
    mockFs.__setMockDirectories(['/mock/home/.cgem']);
    mockFs.__setMockFiles({
      [configPath]: JSON.stringify(createMockConfig()),
    });

    configManager = new ConfigManager();
  });

  afterEach(() => {
    process.env = originalEnv;
    mockFs.__resetMocks();
  });

  describe('constructor', () => {
    test('should create config directory if it does not exist', () => {
      mockFs.__clearMockFileSystem();

      new ConfigManager();

      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/.cgem', {
        recursive: true,
      });
    });

    test('should not create config directory if it already exists', () => {
      new ConfigManager();

      // mkdirSync should not be called again since directory exists
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    test('should return config when file exists', () => {
      const mockConfig = createMockConfig({
        currentProvider: 'anthropic',
        currentModel: 'claude-3-5-sonnet-20241022',
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(mockConfig),
      });

      const result = configManager.getConfig();

      expect(result).toEqual(mockConfig);
      expect(fs.readFileSync).toHaveBeenCalledWith(configPath, 'utf-8');
    });

    test('should return empty config when file does not exist', () => {
      mockFs.__setMockFiles({});

      const result = configManager.getConfig();

      expect(result).toEqual({});
    });

    test('should return empty config when file is corrupted', () => {
      mockFs.__setMockFiles({
        [configPath]: 'invalid json{',
      });

      const result = configManager.getConfig();

      expect(result).toEqual({});
    });
  });

  describe('setConfig', () => {
    test('should write config to file', () => {
      const config = createMockConfig({ currentProvider: 'google' });

      configManager.setConfig(config);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(config, null, 2)
      );
    });
  });

  describe('getProviderApiKey', () => {
    test('should return API key from config file', () => {
      const config = createMockConfig({
        providers: {
          openai: { apiKey: 'config-openai-key' },
          anthropic: { apiKey: 'config-anthropic-key' },
        },
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      expect(configManager.getProviderApiKey('openai')).toBe(
        'config-openai-key'
      );
      expect(configManager.getProviderApiKey('anthropic')).toBe(
        'config-anthropic-key'
      );
    });

    test('should return API key from environment variables when not in config', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      process.env.OPENAI_API_KEY = 'env-openai-key';
      process.env.ANTHROPIC_API_KEY = 'env-anthropic-key';
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'env-google-key';

      expect(configManager.getProviderApiKey('openai')).toBe('env-openai-key');
      expect(configManager.getProviderApiKey('anthropic')).toBe(
        'env-anthropic-key'
      );
      expect(configManager.getProviderApiKey('google')).toBe('env-google-key');
    });

    test('should prefer config file over environment variables', () => {
      const config = createMockConfig({
        providers: {
          openai: { apiKey: 'config-key' },
        },
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      process.env.OPENAI_API_KEY = 'env-key';

      expect(configManager.getProviderApiKey('openai')).toBe('config-key');
    });

    test('should return empty string when no API key found', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      expect(configManager.getProviderApiKey('openai')).toBe('');
    });
  });

  describe('setProviderApiKey', () => {
    test('should update API key in config', () => {
      const initialConfig = createMockConfig();
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(initialConfig),
      });

      configManager.setProviderApiKey('anthropic', 'new-anthropic-key');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining(
          '"anthropic": {\n          "apiKey": "new-anthropic-key"'
        )
      );
    });

    test('should create providers section if it does not exist', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      configManager.setProviderApiKey('openai', 'test-key');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining(
          '"providers": {\n        "openai": {\n          "apiKey": "test-key"'
        )
      );
    });

    test('should create provider section if it does not exist', () => {
      const config = createMockConfig({
        providers: {
          openai: { apiKey: 'existing-key' },
        },
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      configManager.setProviderApiKey('google', 'google-key');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"google": {\n          "apiKey": "google-key"')
      );
    });
  });

  describe('hasValidApiKey', () => {
    test('should return true when API key exists in config', () => {
      const config = createMockConfig({
        providers: {
          openai: { apiKey: 'test-key' },
        },
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      expect(configManager.hasValidApiKey('openai')).toBe(true);
    });

    test('should return true when API key exists in environment', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      process.env.ANTHROPIC_API_KEY = 'env-key';

      expect(configManager.hasValidApiKey('anthropic')).toBe(true);
    });

    test('should return false when no API key exists', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      expect(configManager.hasValidApiKey('google')).toBe(false);
    });

    test('should return false for empty API key', () => {
      const config = createMockConfig({
        providers: {
          openai: { apiKey: '' },
        },
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      expect(configManager.hasValidApiKey('openai')).toBe(false);
    });
  });

  describe('getAvailableProviders', () => {
    test('should return providers with valid API keys', () => {
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key';
      // No Anthropic key

      const result = configManager.getAvailableProviders();

      expect(result).toEqual(['openai', 'google']);
    });

    test('should return empty array when no API keys are configured', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      const result = configManager.getAvailableProviders();

      expect(result).toEqual([]);
    });

    test('should include providers from both config and environment', () => {
      const config = createMockConfig({
        providers: {
          openai: { apiKey: 'config-key' },
        },
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      process.env.ANTHROPIC_API_KEY = 'env-key';

      const result = configManager.getAvailableProviders();

      expect(result).toContain('openai');
      expect(result).toContain('anthropic');
    });
  });

  describe('getCurrentProvider', () => {
    test('should return current provider from config', () => {
      const config = createMockConfig({ currentProvider: 'anthropic' });
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      const result = configManager.getCurrentProvider();

      expect(result).toBe('anthropic');
    });

    test('should return null when no current provider is set', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      const result = configManager.getCurrentProvider();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentModel', () => {
    test('should return current model from config', () => {
      const config = createMockConfig({
        currentModel: 'claude-3-5-sonnet-20241022',
      });
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      const result = configManager.getCurrentModel();

      expect(result).toBe('claude-3-5-sonnet-20241022');
    });

    test('should return null when no current model is set', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      const result = configManager.getCurrentModel();

      expect(result).toBeNull();
    });
  });

  describe('setCurrentProvider', () => {
    test('should update current provider in config', () => {
      const initialConfig = createMockConfig();
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(initialConfig),
      });

      configManager.setCurrentProvider('google');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"currentProvider": "google"')
      );
    });
  });

  describe('setCurrentModel', () => {
    test('should update current model in config', () => {
      const initialConfig = createMockConfig();
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(initialConfig),
      });

      configManager.setCurrentModel('gemini-1.5-pro');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"currentModel": "gemini-1.5-pro"')
      );
    });
  });

  describe('setCurrentProviderAndModel', () => {
    test('should update both provider and model in config', () => {
      const initialConfig = createMockConfig();
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(initialConfig),
      });

      configManager.setCurrentProviderAndModel(
        'anthropic',
        'claude-3-opus-20240229'
      );

      const writeCall = (
        fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>
      ).mock.calls.find(call => call[0] === configPath);
      expect(writeCall).toBeDefined();

      const writtenData = JSON.parse(writeCall![1] as string);
      expect(writtenData.currentProvider).toBe('anthropic');
      expect(writtenData.currentModel).toBe('claude-3-opus-20240229');
    });
  });

  describe('hasCurrentProviderAndModel', () => {
    test('should return true when both provider and model are set', () => {
      const config = createMockConfig({
        currentProvider: 'openai',
        currentModel: 'gpt-4o',
      });

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      const result = configManager.hasCurrentProviderAndModel();

      expect(result).toBe(true);
    });

    test('should return false when provider is missing', () => {
      const config = createMockConfig({
        currentModel: 'gpt-4o',
      });
      delete (config as any).currentProvider;

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      const result = configManager.hasCurrentProviderAndModel();

      expect(result).toBe(false);
    });

    test('should return false when model is missing', () => {
      const config = createMockConfig({
        currentProvider: 'openai',
      });
      delete (config as any).currentModel;

      mockFs.__setMockFiles({
        [configPath]: JSON.stringify(config),
      });

      const result = configManager.hasCurrentProviderAndModel();

      expect(result).toBe(false);
    });

    test('should return false when both are missing', () => {
      mockFs.__setMockFiles({
        [configPath]: JSON.stringify({}),
      });

      const result = configManager.hasCurrentProviderAndModel();

      expect(result).toBe(false);
    });
  });
});
