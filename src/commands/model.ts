import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigManager } from '../utils/config';
import { AIProvider, PROVIDER_MODELS } from '../types';

export async function modelCommand(): Promise<void> {
  const configManager = new ConfigManager();
  const availableProviders = configManager.getAvailableProviders();

  if (availableProviders.length === 0) {
    console.error(chalk.red('❌ No AI providers configured'));
    console.log(
      chalk.gray('Please set up API keys for at least one provider:')
    );
    console.log(chalk.gray('- OpenAI: OPENAI_API_KEY'));
    console.log(chalk.gray('- Anthropic: ANTHROPIC_API_KEY'));
    console.log(chalk.gray('- Google: GOOGLE_GENERATIVE_AI_API_KEY'));
    process.exit(1);
  }

  console.log(chalk.blue('🤖 Configure AI model settings\n'));

  // Show current settings
  const currentProvider = configManager.getCurrentProvider();
  const currentModel = configManager.getCurrentModel();

  if (currentProvider && currentModel) {
    console.log(chalk.gray(`Current: ${currentProvider} - ${currentModel}`));
    console.log();
  }

  // Get provider
  const provider = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message: 'Select AI provider:',
      choices: availableProviders.map(p => ({
        name:
          p === 'openai'
            ? 'OpenAI'
            : p === 'anthropic'
              ? 'Anthropic (Claude)'
              : 'Google (Gemini)',
        value: p,
      })),
      default: currentProvider,
    },
  ]);

  // Get model based on selected provider
  const selectedProvider = provider.value as AIProvider;
  const availableModels = PROVIDER_MODELS[selectedProvider];

  if (!availableModels || availableModels.length === 0) {
    console.error(
      chalk.red(`No models available for provider: ${selectedProvider}`)
    );
    process.exit(1);
  }

  const model = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message: 'Select model:',
      choices: availableModels,
      default:
        currentModel &&
        availableModels &&
        availableModels.includes(currentModel)
          ? currentModel
          : availableModels && availableModels[0],
    },
  ]);

  try {
    configManager.setCurrentProviderAndModel(provider.value, model.value);

    console.log(chalk.green('\n✅ Model configuration updated!'));
    console.log(chalk.gray(`Provider: ${provider.value}`));
    console.log(chalk.gray(`Model: ${model.value}`));
    console.log(
      chalk.gray('\nYou can now chat with any profile using this model.')
    );
  } catch (error) {
    console.error(chalk.red('\n❌ Error updating model configuration:'));
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    );
    process.exit(1);
  }
}

export async function modelListCommand(): Promise<void> {
  const configManager = new ConfigManager();
  const availableProviders = configManager.getAvailableProviders();
  const currentProvider = configManager.getCurrentProvider();
  const currentModel = configManager.getCurrentModel();

  console.log(chalk.blue('🤖 Available AI models\n'));

  if (currentProvider && currentModel) {
    console.log(
      chalk.green(`✓ Current: ${currentProvider} - ${currentModel}\n`)
    );
  } else {
    console.log(
      chalk.yellow('⚠️  No model configured. Use "cgem model" to set one.\n')
    );
  }

  if (availableProviders.length === 0) {
    console.error(chalk.red('❌ No AI providers configured'));
    console.log(
      chalk.gray('Please set up API keys for at least one provider:')
    );
    console.log(chalk.gray('- OpenAI: OPENAI_API_KEY'));
    console.log(chalk.gray('- Anthropic: ANTHROPIC_API_KEY'));
    console.log(chalk.gray('- Google: GOOGLE_GENERATIVE_AI_API_KEY'));
    return;
  }

  console.log(chalk.blue('Available providers and models:\n'));

  availableProviders.forEach(provider => {
    const providerName =
      provider === 'openai'
        ? 'OpenAI'
        : provider === 'anthropic'
          ? 'Anthropic (Claude)'
          : 'Google (Gemini)';

    console.log(chalk.white(`• ${providerName}:`));
    PROVIDER_MODELS[provider].forEach(model => {
      const isCurrent = provider === currentProvider && model === currentModel;
      const marker = isCurrent ? chalk.green('  ✓ ') : '    ';
      const color = isCurrent ? chalk.green : chalk.gray;
      console.log(`${marker}${color(model)}`);
    });
    console.log();
  });

  console.log(chalk.gray('Use "cgem model" to change your model selection.'));
}
