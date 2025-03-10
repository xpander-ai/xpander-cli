#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

import { agent } from './commands/agent';
import { configureConfigureCommand } from './commands/configure';
import { displayBanner } from './utils/banner';
import { validateApiKey } from './utils/client';
import {
  getApiKey,
  getOrganizationId,
  getCurrentProfile,
  listProfiles,
  setPreferredFormat,
} from './utils/config';

// Use a hardcoded version instead of importing from package.json
const version = '0.0.1';

async function isLoggedIn(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;

  // Validate the API key is still working
  return validateApiKey(apiKey);
}

async function promptLogin() {
  console.log(
    chalk.yellow('You need to configure profile to use the Xpander CLI.'),
  );

  const shouldLogin = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configure',
      message: 'Would you like to configure profile now?',
      default: true,
    },
  ]);

  if (shouldLogin.configure) {
    // Create a temporary program just to run the configure command
    const tempProgram = new Command();
    configureConfigureCommand(tempProgram);

    // Find the configure command and execute it
    const configureCmd = tempProgram.commands.find(
      (cmd) => cmd.name() === 'configure',
    );
    if (configureCmd) {
      await configureCmd.parseAsync([
        process.argv[0],
        process.argv[1],
        'configure',
      ]);
    }
  } else {
    console.log(
      chalk.blue(
        'You can configure the profile later by running: xpander configure',
      ),
    );
    process.exit(0);
  }
}

async function showProfileInfo() {
  const currentProfile = getCurrentProfile();
  const orgId = getOrganizationId();

  console.log(chalk.blue('Current profile:'));
  console.log(`  ${chalk.bold(currentProfile)}`);

  if (orgId) {
    console.log(chalk.blue('Organization ID:'));
    console.log(`  ${chalk.bold(orgId)}`);
  } else {
    console.log(chalk.yellow('Organization ID:'));
    console.log(chalk.yellow('  Not set - required for most operations'));
    console.log(
      chalk.yellow('  Run "xpander configure --org YOUR_ORG_ID" to set it'),
    );
  }

  // If there are multiple profiles available, show how to switch
  const profiles = listProfiles();
  if (profiles.length > 1) {
    console.log('');
    console.log(
      chalk.gray(
        `You have ${profiles.length} profiles available. Use 'xpander profile --switch <n>' to switch profiles.`,
      ),
    );
  }
}

async function main() {
  // Display the CLI banner
  displayBanner();

  // Check if this is just 'xpander' with no args or options
  const hasArgs = process.argv.length > 2;
  const isHelpCommand =
    process.argv.includes('--help') || process.argv.includes('-h');
  const isVersionCommand =
    process.argv.includes('--version') || process.argv.includes('-V');

  // If just 'xpander' is run with no args, check if logged in
  if (
    !hasArgs ||
    (!isHelpCommand && !isVersionCommand && process.argv[2] !== 'configure')
  ) {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      await promptLogin();

      // If we've just logged in and there were no other args, show available commands
      if (!hasArgs) {
        console.log('');
        await showProfileInfo();
        console.log('');
        console.log(chalk.green('You can now use the following commands:'));
        console.log('  xpander agent list     - List all your agents');
        console.log('  xpander agent new      - Create a new agent');
        console.log('  xpander agent get      - Get details about your agents');
        console.log('  xpander profile        - Manage your profiles');
        console.log('  xpander --help         - Show all available commands');
        console.log('');
        process.exit(0);
      }
    } else if (!hasArgs) {
      // If logged in and no args, show welcome message, profile info, and available commands
      console.log(chalk.green('Welcome back to Xpander CLI!'));
      console.log('');
      await showProfileInfo();
      console.log('');
      console.log(chalk.green('Available commands:'));
      console.log('  xpander agent list     - List all your agents');
      console.log('  xpander agent new      - Create a new agent');
      console.log('  xpander agent get      - Get details about your agents');
      console.log('  xpander profile        - Manage your profiles');
      console.log('  xpander --help         - Show all available commands');
      console.log('');
      process.exit(0);
    }
  }

  const program = new Command('xpander')
    .version(version)
    .description('Xpander.ai CLI for managing AI agents')
    .option('--output <format>', 'Output format (json, table)', 'table')
    .addHelpCommand()
    .hook('preAction', (_thisCommand, actionCommand) => {
      // Save output format preference if specified
      const options = actionCommand.opts();
      if (options.output) {
        const format = options.output.toLowerCase();
        if (format === 'json' || format === 'table') {
          setPreferredFormat(format);
        } else {
          console.warn(
            chalk.yellow(
              `Warning: Unsupported format '${format}'. Using 'table' instead.`,
            ),
          );
          setPreferredFormat('table');
        }
      }
    });

  // Register commands
  configureConfigureCommand(program);
  agent(program);

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
