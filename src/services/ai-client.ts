import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { AIProvider, AIConfig, ChatMessage } from '../types';

export class AIClient {
  private agent: Agent;
  private config: AIConfig;

  constructor(config: AIConfig, apiKey: string) {
    this.config = config;
    this.agent = this.createAgent(apiKey);
  }

  private createAgent(apiKey: string): Agent {
    const model = this.getProviderModel(apiKey);

    return new Agent({
      name: 'Custom Profile Agent',
      instructions:
        'You are a helpful AI assistant. Follow the system prompt provided in the conversation.',
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
      // Get the last user message and build context from previous messages
      const userMessage = messages[messages.length - 1]?.content || '';
      const systemPrompt =
        messages.find(m => m.role === 'system')?.content || '';

      // Build conversation context
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nConversation history:\n${conversationHistory}\n\nUser: ${userMessage}`
        : `Conversation history:\n${conversationHistory}\n\nUser: ${userMessage}`;

      // Use the agent's generate method
      const result = await this.agent.generate(fullPrompt, {
        maxTokens: this.config.maxTokens,
      });

      // Extract the text from the result
      const response = result.text;

      // Handle streaming if callback is provided
      if (onChunk) {
        // For now, return the full response and call onChunk with it
        // In a real implementation, you'd implement proper streaming
        onChunk(response);
      }

      return response;
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
      await this.agent.generate('Hello', { maxTokens: 1 });
      return true;
    } catch (_error) {
      return false;
    }
  }

  updateConfig(newConfig: Partial<AIConfig>, newApiKey?: string): void {
    this.config = { ...this.config, ...newConfig };
    // Recreate agent with new configuration
    if (newApiKey) {
      this.agent = this.createAgent(newApiKey);
    }
  }
}
