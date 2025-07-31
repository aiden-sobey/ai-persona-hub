#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createCommand } from './commands/create';
import { listCommand } from './commands/list';
import { deleteCommand } from './commands/delete';
import { chatCommand } from './commands/chat';

const program = new Command();

program
  .name('cgem')
  .description('AI Profile CLI - Create custom AI profiles with multiple AI providers')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new AI profile')
  .action(createCommand);

program
  .command('list')
  .alias('ls')
  .description('List all available profiles')
  .action(listCommand);

program
  .command('chat <profile-name>')
  .description('Start a conversation with an AI profile')
  .action(chatCommand);

program
  .command('delete <profile-name>')
  .alias('rm')
  .description('Delete an AI profile')
  .action(deleteCommand);

program.on('command:*', (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log(chalk.gray('Run "cgem --help" for available commands'));
  process.exit(1);
});

if (process.argv.length === 2) {
  console.log(chalk.blue('🔮 Welcome to Custom Gems - AI Profile CLI\n'));
  program.help();
}

program.parse(process.argv);