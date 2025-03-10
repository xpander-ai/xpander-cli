#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

import { version } from '../package.json';
import { agent } from './commands/agent';
import { configureConfigureCommand } from './commands/configure';
import { displayBanner } from './utils/banner';
import { createClient } from './utils/client';
import {
  getApiKey,
  getOrganizationId,
  getCurrentProfile,
  setPreferredFormat,
  setCurrentProfile,
  listProfiles,
} from './utils/config';

// Read the version from package.json instead of hardcoding it

async function isLoggedIn(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;

  // Validation function removed - simply return true if API key exists
  return true;
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

    // Find the configure command and execute it without passing any arguments
    const configureCmd = tempProgram.commands.find(
      (cmd) => cmd.name() === 'configure',
    );
    if (configureCmd) {
      await configureCmd.parseAsync([], { from: 'user' });
    }
  } else {
    console.log(
      chalk.blue(
        'You can configure the profile later by running: xpander configure',
      ),
    );
    // Use return instead of exit to allow the CLI to continue normally
    return;
  }
}

async function showProfileInfo() {
  const currentProfile = getCurrentProfile();
  const orgId = getOrganizationId();

  // Create a more concise output
  let profileInfo = `Profile: ${chalk.green(currentProfile)}`;

  if (orgId) {
    profileInfo += ` | Organization ID: ${chalk.green(orgId)}`;

    // Get agent count from the API
    try {
      const client = createClient();
      const agents = await client.getAgents();

      if (agents && agents.length >= 0) {
        profileInfo += ` | Agents: ${chalk.cyan(agents.length)}`;
      }
    } catch (error) {
      // Ignore errors, we're just trying to get the agent count if possible
    }
  } else {
    profileInfo += ` | ${chalk.yellow('No Organization ID - run "xpander agent list" to auto-detect')}`;
  }

  console.log(profileInfo);

  // We're removing the message about multiple profiles to make the output more concise
}

async function main() {
  // Display the CLI banner
  displayBanner();

  // Check if this is just 'xpander' with no args or options
  const hasArgs = process.argv.length > 2;
  const isHelpCommand =
    process.argv.includes('--help') || process.argv.includes('-h');
  const isVersionCommand =
    process.argv.includes('--version') ||
    process.argv.includes('-V') ||
    process.argv.includes('-v');

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

        // Don't show available commands and usage - keep it concise
        // Return instead of continuing to avoid showing usage
        return;
      }
    } else if (!hasArgs) {
      // If logged in and no args, show welcome message, profile info, and available commands
      console.log(chalk.green('Welcome back to Xpander CLI!'));
      console.log('');
      await showProfileInfo();

      // Keep it concise - don't show available commands and usage
      return;
    }
  }

  // Common code to handle version display
  if (process.argv.includes('-v')) {
    console.log(version);
    process.exit(0);
  }

  // Initialize the CLI program
  const program = new Command('xpander')
    .version(version, '-V, --version', 'Output the version number')
    .description('Xpander.ai CLI for managing AI agents')
    .option('-v', 'Output the version number (alias for -V)')
    .option('--output <format>', 'Output format (json, table)', 'table')
    .option('--profile <name>', 'Profile to use (default: current profile)')
    .addHelpCommand()
    .hook('preAction', (_thisCommand) => {
      // Get options from the root command (global options)
      const globalOptions = program.opts();

      // Set the current profile if specified
      if (globalOptions.profile) {
        const availableProfiles = listProfiles();
        if (availableProfiles.includes(globalOptions.profile)) {
          setCurrentProfile(globalOptions.profile);
        } else {
          console.error(
            chalk.red(`Profile "${globalOptions.profile}" does not exist.`),
          );
          console.error(
            chalk.yellow(
              `Available profiles: ${availableProfiles.join(', ') || 'none'}`,
            ),
          );
          console.error(
            chalk.yellow(
              `Run "xpander configure --profile ${globalOptions.profile}" to create this profile.`,
            ),
          );
          process.exitCode = 1;
          process.exit(1); // Exit immediately to prevent further execution
        }
      }

      // Set the output format if specified
      if (globalOptions.output) {
        setPreferredFormat(globalOptions.output);
      }
    });

  // Register commands
  configureConfigureCommand(program);
  agent(program);

  await program.parseAsync(process.argv);

  // Explicitly set exit code to 0 for successful completion
  process.exitCode = 0;
}

main().catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exitCode = 1;
});

// Trigger build
