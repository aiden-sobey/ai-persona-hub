import chalk from 'chalk';
import { ProfileManager } from '../services/profile-manager';

export async function listCommand(): Promise<void> {
  try {
    const profileManager = new ProfileManager();
    const profiles = await profileManager.listProfiles();

    if (profiles.length === 0) {
      console.log(chalk.yellow('No profiles found. Create one with:'));
      console.log(chalk.white('cgem create'));
      return;
    }

    console.log(chalk.blue(`\n📋 Available profiles (${profiles.length}):\n`));

    profiles.forEach(profile => {
      console.log(chalk.white(`• ${profile.name}`));
      console.log(chalk.gray(`  ID: ${profile.id}`));
      console.log(chalk.gray(`  Created: ${new Date(profile.createdAt).toLocaleDateString()}`));
      
      if (profile.lastUsed) {
        console.log(chalk.gray(`  Last used: ${new Date(profile.lastUsed).toLocaleDateString()}`));
      }
      
      if (profile.maxTokens) {
        console.log(chalk.gray(`  Max tokens: ${profile.maxTokens}`));
      }
      
      const promptPreview = profile.systemPrompt.slice(0, 100);
      console.log(chalk.gray(`  Prompt: ${promptPreview}${profile.systemPrompt.length > 100 ? '...' : ''}`));
      console.log();
    });

    console.log(chalk.gray('Start a conversation with:'));
    console.log(chalk.white('cgem chat <profile-name>'));
  } catch (error) {
    console.error(chalk.red('❌ Error listing profiles:'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}