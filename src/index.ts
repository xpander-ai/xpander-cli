#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

import { version } from '../package.json';
import { agent } from './commands/agent';
import { configureConfigureCommand } from './commands/configure';
import { configureDeployCommand } from './commands/deploy';
import { configureInitializeCommand } from './commands/initialize';
import { configureInterfacesCommands } from './commands/interfaces/index';
import {
  configureLoginCommand,
  configureProfileCommand,
} from './commands/login';
import { configureLogsCommand } from './commands/logs';
import { configureOperationsCommand } from './commands/operations/index';
import { allCommands } from './types';
import { displayBanner } from './utils/banner';
import { createClient } from './utils/client';
import {
  getApiKey,
  getOrganizationId,
  getCurrentProfile,
  setPreferredFormat,
  listProfiles,
} from './utils/config';
export * from './types';

// Read the version from package.json instead of hardcoding it

async function isLoggedIn(): Promise<boolean> {
  const apiKey = getApiKey();
  return !!apiKey; // Simple check if API key exists
}

async function promptLogin() {
  console.log(
    chalk.yellow(
      'You need to configure your credentials to use the Xpander CLI.',
    ),
  );

  const shouldLogin = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'configure',
      message: 'Would you like to configure your credentials now?',
      default: true,
    },
  ]);

  if (shouldLogin.configure) {
    // Create a temporary program just to run the configure command
    const tempProgram = new Command();
    configureLoginCommand(tempProgram);

    // Find the configure command and execute it without passing any arguments
    const configureCmd = tempProgram.commands.find(
      (cmd) => cmd.name() === 'login',
    );
    if (configureCmd) {
      await configureCmd.parseAsync([]);
    }
  } else {
    console.log(
      chalk.yellow(
        'You can configure your credentials later by running: xpander configure',
      ),
    );
    process.exit(0);
  }
}

async function showProfileInfo() {
  const currentProfile = getCurrentProfile();
  let orgId;
  let agents = [];

  try {
    orgId = getOrganizationId();
    let profileInfo = `Profile: ${chalk.green(currentProfile)}`;

    if (orgId) {
      profileInfo += ` | Organization ID: ${chalk.green(orgId)}`;

      try {
        const client = createClient();
        const response = await client.getAgents();
        agents = response || [];
        profileInfo += ` | Agents: ${chalk.cyan(agents.length)}`;
      } catch (error: any) {
        if (error.status === 403) {
          profileInfo += ` | ${chalk.yellow('Authorization error: API key may be invalid')}`;
        } else {
          profileInfo += ` | ${chalk.yellow('Error fetching agents')}`;
        }
      }
    } else {
      profileInfo += ` | ${chalk.yellow('No Organization ID - run "xpander agent list" to auto-detect')}`;
    }

    console.log(profileInfo);
  } catch (error) {
    console.log(`Profile: ${chalk.green(currentProfile)}`);
  }
}

async function main(): Promise<void> {
  // Display banner
  const isSettingDefaultProfile =
    process.argv.includes('profile') && process.argv.includes('--set-default');

  // Process profile option first, before displaying banner
  const profileArg = process.argv.findIndex((arg) => arg === '--profile');
  if (profileArg !== -1 && profileArg + 1 < process.argv.length) {
    const profileName = process.argv[profileArg + 1];
    const availableProfiles = listProfiles();
    if (availableProfiles.includes(profileName)) {
      process.env.XPANDER_CURRENT_PROFILE = profileName;
    }
  }

  // Display the CLI banner, but skip if we're just setting the default profile
  if (!isSettingDefaultProfile) {
    displayBanner();
  }

  // Check if they're running a command or just showing help
  const hasArgs = process.argv.length > 2;
  const hasCommand = process.argv.some((arg) => {
    return allCommands.includes(arg);
  });
  const isRequestingHelp =
    process.argv.includes('--help') || process.argv.includes('-h');
  const isLoginRequest = process.argv.includes('login');
  const isRequestingVersion =
    process.argv.includes('--version') || process.argv.includes('-v');

  // If they're just requesting help or version, we can proceed without checking login
  if (
    !isLoginRequest &&
    !isRequestingHelp &&
    !isRequestingVersion &&
    !(await isLoggedIn()) &&
    hasCommand
  ) {
    await promptLogin();
    return;
  }

  // Initialize the CLI program
  const program = new Command('xpander')
    .version(version, '-v, --version', 'Output the version number')
    .description('Xpander.ai CLI for managing AI agents')
    .option('--output <format>', 'Output format (json, table)', 'table')
    .option('--profile <n>', 'Profile to use (default: current profile)')
    .addHelpCommand();

  // Register commands
  configureConfigureCommand(program);
  configureLoginCommand(program);
  configureProfileCommand(program);
  configureInterfacesCommands(program);
  configureOperationsCommand(program);
  configureDeployCommand(program);
  configureInitializeCommand(program);
  configureLogsCommand(program);
  agent(program);

  // If no arguments or commands provided, show welcome message and help
  if (!hasArgs || (!hasCommand && !isRequestingHelp && !isRequestingVersion)) {
    if (await isLoggedIn()) {
      console.log(chalk.green('Welcome to Xpander CLI!'));
      console.log('');
      await showProfileInfo();
    } else {
      console.log(chalk.green('Welcome to Xpander CLI!'));
      console.log('');
      console.log(
        chalk.yellow(
          'You are not logged in. Run "xpander configure" to set up your credentials.',
        ),
      );
    }
    console.log('');
    program.outputHelp();
    return;
  }

  // Skip welcome message for interfaces commands
  const isInterfacesCommand = process.argv.includes('interfaces');
  const isOperationsCommand = process.argv.includes('operations');
  if (isInterfacesCommand || isOperationsCommand) {
    try {
      await program.parseAsync(process.argv);
      process.exit(0);
    } catch (err: any) {
      console.error(chalk.red('Error: ') + (err.message || String(err)));
      process.exit(1);
    }
    return;
  }

  try {
    // Set the output format if specified in global options
    program.hook('preAction', () => {
      // Get options from the root command (global options)
      const globalOptions = program.opts();

      // Set the current profile if specified
      if (globalOptions.profile) {
        const availableProfiles = listProfiles();
        if (availableProfiles.includes(globalOptions.profile)) {
          // We set it but we don't save it to config, just for this command execution
          process.env.XPANDER_CURRENT_PROFILE = globalOptions.profile;
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

    await program.parseAsync(process.argv);
    process.exit(0);
  } catch (err: any) {
    if (err.status === 403) {
      console.error(
        chalk.red('Authentication Error: ') +
          'You lack permission for this action.',
      );
      console.error(
        chalk.yellow(
          'Try running "xpander configure" to update your API credentials.',
        ),
      );
    } else {
      console.error(chalk.red('Error: ') + (err.message || String(err)));
    }
    process.exit(1);
  }
}

main().catch((error: any) => {
  console.error(chalk.red('Error:'), error.message || String(error));
  process.exitCode = 1;
});

// Trigger build
