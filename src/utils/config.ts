import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AIProvider, ProviderConfig } from '../types';

export interface AppConfig {
  providers?: ProviderConfig;
  currentProvider?: AIProvider;
  currentModel?: string;
  defaultMaxTokens?: number;
}

export class ConfigManager {
  private configPath: string;

  constructor() {
    const configDir = path.join(os.homedir(), '.cgem');
    this.configPath = path.join(configDir, 'config.json');
    this.ensureConfigDirectory();
  }

  private ensureConfigDirectory(): void {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }

  getConfig(): AppConfig {
    if (!fs.existsSync(this.configPath)) {
      return {};
    }

    try {
      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (_error) {
      return {};
    }
  }

  setConfig(config: AppConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  getProviderApiKey(provider: AIProvider): string {
    const config = this.getConfig();

    // Check config file first
    if (config.providers?.[provider]?.apiKey) {
      return config.providers[provider].apiKey;
    }

    // Fallback to environment variables
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'anthropic':
        return process.env.ANTHROPIC_API_KEY || '';
      case 'google':
        return process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
      default:
        return '';
    }
  }

  setProviderApiKey(provider: AIProvider, apiKey: string): void {
    const config = this.getConfig();
    if (!config.providers) {
      config.providers = {};
    }
    if (!config.providers[provider]) {
      config.providers[provider] = { apiKey: '' };
    }
    config.providers[provider].apiKey = apiKey;
    this.setConfig(config);
  }

  hasValidApiKey(provider: AIProvider): boolean {
    return !!this.getProviderApiKey(provider);
  }

  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    const allProviders: AIProvider[] = ['openai', 'anthropic', 'google'];

    for (const provider of allProviders) {
      if (this.hasValidApiKey(provider)) {
        providers.push(provider);
      }
    }

    return providers;
  }

  getCurrentProvider(): AIProvider | null {
    const config = this.getConfig();
    return config.currentProvider || null;
  }

  getCurrentModel(): string | null {
    const config = this.getConfig();
    return config.currentModel || null;
  }

  setCurrentProvider(provider: AIProvider): void {
    const config = this.getConfig();
    config.currentProvider = provider;
    this.setConfig(config);
  }

  setCurrentModel(model: string): void {
    const config = this.getConfig();
    config.currentModel = model;
    this.setConfig(config);
  }

  setCurrentProviderAndModel(provider: AIProvider, model: string): void {
    const config = this.getConfig();
    config.currentProvider = provider;
    config.currentModel = model;
    this.setConfig(config);
  }

  hasCurrentProviderAndModel(): boolean {
    const config = this.getConfig();
    return !!(config.currentProvider && config.currentModel);
  }
}
