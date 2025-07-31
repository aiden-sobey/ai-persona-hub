import inquirer from 'inquirer';
import chalk from 'chalk';
import { ProfileManager } from '../services/profile-manager';

interface CreateAnswers {
  name: string;
  systemPrompt: string;
  maxTokens: number;
}

export async function createCommand(): Promise<void> {
  console.log(chalk.blue('🔮 Creating a new AI profile...\n'));

  // Get profile name
  const name = await inquirer.prompt([
    {
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
      },
    },
  ]);

  // Get system prompt
  const systemPrompt = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: 'System prompt:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'System prompt is required';
        }
        return true;
      },
    },
  ]);

  // Get max tokens
  const maxTokens = await inquirer.prompt([
    {
      type: 'number',
      name: 'value',
      message: 'Max tokens (optional):',
      default: 1000,
      validate: (input: number) => {
        if (input && (input < 1 || input > 8192)) {
          return 'Max tokens must be between 1 and 8192';
        }
        return true;
      },
    },
  ]);

  const answers: CreateAnswers = {
    name: name.value,
    systemPrompt: systemPrompt.value,
    maxTokens: maxTokens.value,
  };

  try {
    const profileManager = new ProfileManager();
    const profile = await profileManager.createProfile({
      name: answers.name,
      systemPrompt: answers.systemPrompt,
      maxTokens: answers.maxTokens,
    });

    console.log(chalk.green('\n✅ Profile created successfully!'));
    console.log(chalk.gray(`Profile ID: ${profile.id}`));
    console.log(chalk.gray(`Use: ${chalk.white(`cgem chat ${profile.name}`)}`));
  } catch (error) {
    console.error(chalk.red('\n❌ Error creating profile:'));
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    );
    process.exit(1);
  }
}
