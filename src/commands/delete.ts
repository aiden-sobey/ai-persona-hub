import inquirer from 'inquirer';
import chalk from 'chalk';
import { ProfileManager } from '../services/profile-manager';

export async function deleteCommand(profileName: string): Promise<void> {
  if (!profileName || !profileName.trim()) {
    console.error(chalk.red('❌ Profile name is required'));
    console.log(chalk.gray('Usage: cgem delete <profile-name>'));
    process.exit(1);
  }

  try {
    const profileManager = new ProfileManager();
    const profile = await profileManager.getProfile(profileName);

    if (!profile) {
      console.error(chalk.red(`❌ Profile '${profileName}' not found`));
      process.exit(1);
    }

    console.log(chalk.yellow(`\n⚠️  You are about to delete the profile:`));
    console.log(chalk.white(`   Name: ${profile.name}`));
    console.log(chalk.gray(`   ID: ${profile.id}`));
    console.log(
      chalk.gray(
        `   Created: ${new Date(profile.createdAt).toLocaleDateString()}`
      )
    );
    if (profile.maxTokens) {
      console.log(chalk.gray(`   Max tokens: ${profile.maxTokens}`));
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to delete this profile?',
        default: false,
      },
    ]);

    if (!confirmed) {
      console.log(chalk.gray('Deletion cancelled.'));
      return;
    }

    const deleted = await profileManager.deleteProfile(profileName);

    if (deleted) {
      console.log(
        chalk.green(`\n✅ Profile '${profile.name}' deleted successfully`)
      );
    } else {
      console.error(chalk.red('❌ Failed to delete profile'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('❌ Error deleting profile:'));
    console.error(
      chalk.red(error instanceof Error ? error.message : 'Unknown error')
    );
    process.exit(1);
  }
}
