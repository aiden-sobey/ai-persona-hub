import inquirer from 'inquirer';
import chalk from 'chalk';
import { ProfileManager } from '../services/profile-manager';
import { AIProvider, PROVIDER_MODELS } from '../types';
import { ConfigManager } from '../utils/config';

interface CreateAnswers {
  name: string;
  systemPrompt: string;
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}

export async function createCommand(): Promise<void> {
  console.log(chalk.blue('🔮 Creating a new AI profile...\n'));

  const configManager = new ConfigManager();
  const availableProviders = configManager.getAvailableProviders();

  if (availableProviders.length === 0) {
    console.error(chalk.red('❌ No AI providers configured'));
    console.log(chalk.gray('Please set up API keys for at least one provider:'));
    console.log(chalk.gray('- OpenAI: OPENAI_API_KEY'));
    console.log(chalk.gray('- Anthropic: ANTHROPIC_API_KEY'));
    console.log(chalk.gray('- Google: GOOGLE_GENERATIVE_AI_API_KEY'));
    process.exit(1);
  }

  // Get profile name
  const name = await inquirer.prompt([{
    type: 'input',
    name: 'value',
    message: 'Profile name:',
    validate: (input: string) => {
      if (!input.trim()) {
        return 'Profile name is required';
      }
      if (input.length > 50) {
        return 'Profile name must be 50 characters or less';
      }
      return true;
    }
  }]);

  // Get system prompt
  const systemPrompt = await inquirer.prompt([{
    type: 'input',
    name: 'value',
    message: 'System prompt:',
    validate: (input: string) => {
      if (!input.trim()) {
        return 'System prompt is required';
      }
      return true;
    }
  }]);

  // Get provider
  const provider = await inquirer.prompt([{
    type: 'list',
    name: 'value',
    message: 'Select AI provider:',
    choices: availableProviders.map(p => ({
      name: p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic (Claude)' : 'Google (Gemini)',
      value: p
    }))
  }]);

  // Get model based on selected provider
  const model = await inquirer.prompt([{
    type: 'list',
    name: 'value',
    message: 'Select model:',
    choices: PROVIDER_MODELS[provider.value as AIProvider],
    default: PROVIDER_MODELS[provider.value as AIProvider][0]
  }]);

  // Get temperature
  const temperature = await inquirer.prompt([{
    type: 'number',
    name: 'value',
    message: 'Temperature (0.0 - 1.0):',
    default: 0.7,
    validate: (input: number) => {
      if (input < 0 || input > 1) {
        return 'Temperature must be between 0.0 and 1.0';
      }
      return true;
    }
  }]);

  // Get max tokens
  const maxTokens = await inquirer.prompt([{
    type: 'number',
    name: 'value',
    message: 'Max tokens (optional):',
    default: 1000,
    validate: (input: number) => {
      if (input && (input < 1 || input > 8192)) {
        return 'Max tokens must be between 1 and 8192';
      }
      return true;
    }
  }]);

  const answers: CreateAnswers = {
    name: name.value,
    systemPrompt: systemPrompt.value,
    provider: provider.value,
    model: model.value,
    temperature: temperature.value,
    maxTokens: maxTokens.value
  };

  try {
    const profileManager = new ProfileManager();
    const profile = await profileManager.createProfile({
      name: answers.name,
      systemPrompt: answers.systemPrompt,
      provider: answers.provider,
      model: answers.model,
      temperature: answers.temperature,
      maxTokens: answers.maxTokens
    });

    console.log(chalk.green('\n✅ Profile created successfully!'));
    console.log(chalk.gray(`Profile ID: ${profile.id}`));
    console.log(chalk.gray(`Use: ${chalk.white(`cgem chat ${profile.name}`)}`));
  } catch (error) {
    console.error(chalk.red('\n❌ Error creating profile:'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}