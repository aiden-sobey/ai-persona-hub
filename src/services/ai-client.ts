import { Agent } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { randomUUID } from 'crypto';
import { AIConfig, AIProfile } from '../types';

export class AIClient {
  private agent: Agent;
  private config: AIConfig;
  private profile: AIProfile;
  private threadId: string;

  constructor(config: AIConfig, profile: AIProfile, apiKey: string) {
    this.config = config;
    this.profile = profile;
    this.agent = this.createAgent(apiKey);
    this.threadId = randomUUID();
  }

  private createAgent(apiKey: string): Agent {
    const model = this.getProviderModel(apiKey);

    // Create memory instance with working memory enabled and message range of 10
    const memory = new Memory({
      storage: new LibSQLStore({
        url: 'file:./memory.db',
      }),
      options: {
        workingMemory: { enabled: true },
      },
    });

    return new Agent({
      name: this.profile.name,
      instructions: this.profile.systemPrompt,
      model,
      memory,
    });
  }

  private getProviderModel(apiKey: string) {
    // Set the API key in the environment for the providers
    switch (this.config.provider) {
      case 'openai':
        process.env.OPENAI_API_KEY = apiKey;
        return openai(this.config.model);
      case 'anthropic':
        process.env.ANTHROPIC_API_KEY = apiKey;
        return anthropic(this.config.model);
      case 'google':
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
        return google(this.config.model);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  async sendMessage(
    message: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      // Use the agent's stream method with memory parameters
      const stream = await this.agent.stream(message, {
        maxTokens: this.config.maxTokens,
        resourceId: this.profile.id,
        threadId: this.threadId,
      });

      let fullResponse = '';

      // Stream the response in real-time
      for await (const chunk of stream.textStream) {
        fullResponse += chunk;

        if (onChunk) {
          onChunk(chunk);
        }
      }

      return fullResponse;
    } catch (_error) {
      if (_error instanceof Error) {
        throw new Error(`AI API error: ${_error.message}`);
      }
      throw new Error(
        'Unknown error occurred while communicating with AI provider'
      );
    }
  }

  updateConfig(
    newConfig: Partial<AIConfig>,
    newApiKey?: string,
    newProfile?: AIProfile
  ): void {
    this.config = { ...this.config, ...newConfig };
    if (newProfile) {
      this.profile = newProfile;
    }
    // Recreate agent with new configuration
    if (newApiKey || newProfile) {
      this.agent = this.createAgent(newApiKey || '');
    }
  }
}
