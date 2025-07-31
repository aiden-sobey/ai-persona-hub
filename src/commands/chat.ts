import inquirer from 'inquirer';
import chalk from 'chalk';
import { ProfileManager } from '../services/profile-manager';
import { ConfigManager } from '../utils/config';
import { AIClient } from '../services/ai-client';
import { ChatMessage, ConversationState } from '../types';

export async function chatCommand(profileName: string): Promise<void> {
  if (!profileName) {
    console.error(chalk.red('❌ Profile name is required'));
    console.log(chalk.gray('Usage: cgem chat <profile-name>'));
    process.exit(1);
  }

  try {
    const profileManager = new ProfileManager();
    const configManager = new ConfigManager();
    
    const profile = await profileManager.getProfile(profileName);
    if (!profile) {
      console.error(chalk.red(`❌ Profile '${profileName}' not found`));
      console.log(chalk.gray('List available profiles with: cgem list'));
      process.exit(1);
    }

    const apiKey = configManager.getProviderApiKey(profile.provider);
    if (!apiKey) {
      console.error(chalk.red(`❌ ${profile.provider} API key not found`));
      console.log(chalk.gray(`Set your API key with environment variable or in ~/.cgem/config.json:`));
      switch (profile.provider) {
        case 'openai':
          console.log(chalk.gray('Environment: OPENAI_API_KEY'));
          break;
        case 'anthropic':
          console.log(chalk.gray('Environment: ANTHROPIC_API_KEY'));
          break;
        case 'google':
          console.log(chalk.gray('Environment: GOOGLE_GENERATIVE_AI_API_KEY'));
          break;
      }
      process.exit(1);
    }

    const aiClient = new AIClient({
      provider: profile.provider,
      model: profile.model,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens
    }, apiKey);

    const conversationState: ConversationState = {
      profileId: profile.id,
      messages: [
        {
          role: 'system',
          content: profile.systemPrompt
        }
      ]
    };

    await profileManager.updateLastUsed(profileName);

    console.log(chalk.blue(`\n💬 Starting conversation with ${chalk.white(profile.name)}`));
    console.log(chalk.gray(`Provider: ${profile.provider}`));
    console.log(chalk.gray(`Model: ${profile.model}`));
    console.log(chalk.gray('Type "exit" or "quit" to end the conversation\n'));

    while (true) {
      const { userMessage } = await inquirer.prompt([
        {
          type: 'input',
          name: 'userMessage',
          message: chalk.green('You:'),
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Please enter a message';
            }
            return true;
          }
        }
      ]);

      if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
        console.log(chalk.gray('\nGoodbye! 👋'));
        break;
      }

      conversationState.messages.push({
        role: 'user',
        content: userMessage
      });

      try {
        console.log(chalk.blue('AI:'), chalk.gray('thinking...'));
        
        const response = await aiClient.sendMessage(
          conversationState.messages,
          (chunk: string) => {
            process.stdout.write(chunk);
          }
        );

        if (!response) {
          console.log(chalk.red('\n❌ No response from AI'));
          continue;
        }

        conversationState.messages.push({
          role: 'assistant',
          content: response
        });

        console.log('\n');
      } catch (error) {
        console.error(chalk.red('\n❌ Error getting AI response:'));
        console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
        console.log(chalk.gray('You can continue the conversation or type "exit" to quit.\n'));
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Error starting chat:'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}