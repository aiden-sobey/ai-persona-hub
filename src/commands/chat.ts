import inquirer from 'inquirer';
import chalk from 'chalk';
import { ProfileManager } from '../services/profile-manager';
import { ConfigManager } from '../utils/config';
import { AIClient } from '../services/ai-client';
import { ChatHistoryManager } from '../services/chat-history-manager';
import { ChatInputHandler } from '../services/chat-input-handler';

export async function chatCommand(profileName?: string): Promise<void> {
  let selectedProfileName = profileName;

  if (!selectedProfileName) {
    const profileManager = new ProfileManager();
    const profiles = await profileManager.listProfiles();

    if (profiles.length === 0) {
      console.log(chalk.yellow('No profiles found. Create one with:'));
      console.log(chalk.white('cgem create'));
      process.exit(0);
    }

    if (profiles.length === 1) {
      selectedProfileName = profiles[0].id;
      console.log(chalk.blue(`Using profile: ${profiles[0].name}`));
    } else {
      const choices = profiles.map(profile => {
        const lastUsed = profile.lastUsed
          ? `Last used: ${new Date(profile.lastUsed).toLocaleDateString()}`
          : 'Never used';
        const promptPreview = profile.systemPrompt.slice(0, 60);
        const preview =
          profile.systemPrompt.length > 60
            ? `${promptPreview}...`
            : promptPreview;

        return {
          name: `${profile.name} - ${lastUsed}\n  ${chalk.gray(preview)}`,
          value: profile.id,
          short: profile.name,
        };
      });

      const { selectedProfile } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedProfile',
          message: 'Select a profile to chat with:',
          choices,
          pageSize: 10,
        },
      ]);

      selectedProfileName = selectedProfile;
    }
  }

  try {
    const profileManager = new ProfileManager();
    const configManager = new ConfigManager();

    if (!selectedProfileName) {
      console.error(chalk.red('❌ No profile selected'));
      process.exit(1);
    }

    const profile = await profileManager.getProfile(selectedProfileName);
    if (!profile) {
      console.error(chalk.red(`❌ Profile '${selectedProfileName}' not found`));
      console.log(chalk.gray('List available profiles with: cgem list'));
      process.exit(1);
    }

    const currentProvider = configManager.getCurrentProvider();
    const currentModel = configManager.getCurrentModel();

    if (!currentProvider || !currentModel) {
      console.error(chalk.red('❌ No AI model configured'));
      console.log(chalk.gray('Configure a model first with: cgem model'));
      process.exit(1);
    }

    const apiKey = configManager.getProviderApiKey(currentProvider);
    if (!apiKey) {
      console.error(chalk.red(`❌ ${currentProvider} API key not found`));
      console.log(
        chalk.gray(
          `Set your API key with environment variable or in ~/.cgem/config.json:`
        )
      );
      switch (currentProvider) {
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

    const aiClient = new AIClient(
      {
        provider: currentProvider,
        model: currentModel,
        maxTokens: profile.maxTokens,
      },
      profile,
      apiKey
    );

    // Initialize chat history manager and load history
    const chatHistoryManager = new ChatHistoryManager();
    const chatHistory = await chatHistoryManager.loadChatHistory(profile.id);

    // Initialize input handler with history
    const inputHandler = new ChatInputHandler(chatHistory.userMessages);

    await profileManager.updateLastUsed(selectedProfileName);

    console.log(
      chalk.blue(`\n💬 Starting conversation with ${chalk.white(profile.name)}`)
    );
    console.log(chalk.gray(`Provider: ${currentProvider}`));
    console.log(chalk.gray(`Model: ${currentModel}`));
    console.log(chalk.gray('Type "exit" or "quit" to end the conversation'));
    console.log(
      chalk.gray('Use ↑ and ↓ arrows to navigate through previous messages\n')
    );

    try {
      while (true) {
        const userMessage = await inputHandler.promptForInput();

        if (!userMessage.trim()) {
          console.log(chalk.yellow('Please enter a message'));
          continue;
        }

        if (
          userMessage.toLowerCase() === 'exit' ||
          userMessage.toLowerCase() === 'quit'
        ) {
          console.log(chalk.gray('\nGoodbye! 👋'));
          break;
        }

        // Save the user message to history
        await chatHistoryManager.addUserMessage(profile.id, userMessage.trim());

        try {
          console.log(chalk.blue('AI:'), chalk.gray('thinking...\n'));

          const response = await aiClient.sendMessage(
            userMessage,
            (chunk: string) => {
              process.stdout.write(chunk);
            }
          );

          if (!response) {
            console.log(chalk.red('\n❌ No response from AI'));
            continue;
          }

          console.log('\n');
        } catch (error) {
          console.error(chalk.red('\n❌ Error getting AI response:'));
          console.error(
            chalk.red(error instanceof Error ? error.message : 'Unknown error')
          );
          console.log(
            chalk.gray(
              'You can continue the conversation or type "exit" to quit.\n'
            )
          );
        }
      }
    } finally {
      // Clean up input handler
      inputHandler.close();

      // Note: Conversation history is now automatically managed by agent memory
      // The ChatHistoryManager still tracks user input history for the input handler
    }
  } catch (error) {
    console.error(chalk.red('❌ Error starting chat:'));
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    );
    process.exit(1);
  }
}
