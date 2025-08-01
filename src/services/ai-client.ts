import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { AIConfig, ChatMessage, AIProfile } from '../types';

export class AIClient {
  private agent: Agent;
  private config: AIConfig;
  private profile: AIProfile;

  constructor(config: AIConfig, profile: AIProfile, apiKey: string) {
    this.config = config;
    this.profile = profile;
    this.agent = this.createAgent(apiKey);
  }

  private createAgent(apiKey: string): Agent {
    const model = this.getProviderModel(apiKey);

    return new Agent({
      name: this.profile.name,
      instructions: this.profile.systemPrompt,
      model,
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
    messages: ChatMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      // Filter out system messages as they're handled by Agent instructions
      const conversationMessages = messages.filter(m => m.role !== 'system');

      // Use the agent's stream method for real-time streaming
      const stream = await this.agent.stream(conversationMessages, {
        maxTokens: this.config.maxTokens,
      });

      let fullResponse = '';

      // Stream the response in real-time
      for await (const chunk of stream.textStream) {
        fullResponse += chunk;

        // Call the chunk callback if provided (for real-time streaming to console)
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

  async validateConnection(): Promise<boolean> {
    try {
      const stream = await this.agent.stream(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 1 }
      );
      // Just consume the first chunk to test the connection
      for await (const _chunk of stream.textStream) {
        break; // Exit after first chunk to minimize usage
      }
      return true;
    } catch (_error) {
      return false;
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
