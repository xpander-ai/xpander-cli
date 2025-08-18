#!/usr/bin/env node

import boxen from 'boxen';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

import { version } from '../package.json';
import { agent } from './commands/agent';
import { configureConfigureCommand } from './commands/configure';
import { configureDeployCommand } from './commands/deploy';
import { configureDevCommand } from './commands/dev';
import { configureInitializeCommand } from './commands/initialize';
// import { configureInterfacesCommands } from './commands/interfaces/index';
import {
  configureLoginCommand,
  configureProfileCommand,
} from './commands/login';
import { configureLogsCommand } from './commands/logs';
// import { configureOperationsCommand } from './commands/operations/index';
import { configureRestartCommand } from './commands/restart';
import { configureSecretsSyncCommand } from './commands/secrets-sync';
import { configureStopCommand } from './commands/stop';
import { allCommands } from './types';
import { displayBanner, displayCustomHelp } from './utils/banner';
import { getApiKey, setPreferredFormat, listProfiles } from './utils/config';
export * from './types';

// Read the version from package.json instead of hardcoding it

/**
 * Check if running in non-interactive mode (CI environment or flags)
 */
function isNonInteractive(): boolean {
  // Check for CI environment variables
  const ciEnvVars = [
    'CI',
    'CONTINUOUS_INTEGRATION',
    'BUILD_NUMBER',
    'JENKINS_URL',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'CIRCLECI',
    'TRAVIS',
    'BUILDKITE',
  ];

  if (ciEnvVars.some((envVar) => process.env[envVar])) {
    return true;
  }

  // Check for explicit non-interactive flags
  if (
    process.env.XPANDER_NON_INTERACTIVE === 'true' ||
    process.env.XPANDER_YES === 'true'
  ) {
    return true;
  }

  return false;
}

async function isLoggedIn(): Promise<boolean> {
  // Get API key from various sources
  const apiKey =
    process.env.XPANDER_CLI_API_KEY ||
    process.env.xpander_api_key ||
    process.env.XPANDER_API_KEY ||
    getApiKey();

  // Just check if API key exists, don't validate with API call for performance
  return !!apiKey;
}

async function promptLogin() {
  console.log(
    chalk.yellow(
      'You need to configure your credentials to use the Xpander CLI.',
    ),
  );

  const { shouldLogin } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldLogin',
      message: 'Would you like to configure your credentials now?',
      default: true,
    },
  ]);

  if (shouldLogin) {
    // Create a temporary program just to run the configure command
    const tempProgram = new Command();
    configureLoginCommand(tempProgram);

    // Find the configure command and execute it without passing any arguments
    const loginCmd = tempProgram.commands.find((cmd) => cmd.name() === 'login');
    if (loginCmd) {
      await loginCmd.parseAsync([]);
    }
  } else {
    console.log(
      chalk.yellow(
        'You can configure your credentials later by running: xpander login',
      ),
    );
    process.exit(0);
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

  // Display the CLI banner, but skip if we're just setting the default profile or running invoke
  const isInvokeCommand = process.argv.includes('invoke');
  if (!isSettingDefaultProfile && !isInvokeCommand) {
    await displayBanner();
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
    .alias('x')
    .usage('[options] [command] (alias: x)')
    .version(version, '-v, --version', 'Output the version number')
    .description('Xpander.ai CLI for managing AI agents')
    .option('--output <format>', 'Output format (json, table)', 'table')
    .option('--profile <n>', 'Profile to use (default: current profile)')
    .option('--api-key <key>', 'API key to use for authentication')
    .option(
      '-y, --yes',
      'Automatically answer yes to all prompts (non-interactive mode)',
    )
    .option('--no-interactive', 'Run in non-interactive mode')
    .addHelpCommand();

  // Register commands
  configureConfigureCommand(program);
  configureLoginCommand(program);
  configureProfileCommand(program);
  // configureInterfacesCommands(program);  // Hidden - needs refactoring
  // configureOperationsCommand(program);   // Hidden - needs refactoring
  configureDeployCommand(program);
  configureRestartCommand(program);
  configureStopCommand(program);
  configureInitializeCommand(program);
  configureDevCommand(program);
  configureLogsCommand(program);
  configureSecretsSyncCommand(program);
  agent(program);

  // If no arguments or commands provided, show welcome message and help
  if (!hasArgs || (!hasCommand && !isRequestingHelp && !isRequestingVersion)) {
    if (!(await isLoggedIn())) {
      console.log(
        chalk.yellow(
          'You are not logged in. Run "xpander login" to set up your credentials.',
        ),
      );
      console.log('');
    }

    displayCustomHelp();

    // Show help resources
    console.log('');
    const helpResources = `📚 docs.xpander.ai
💬 Slack: bit.ly/xpander-slack  
🎯 Schedule a Demo: e.xpander.ai/demo`;

    console.log(
      boxen(helpResources, {
        padding: 1,
        margin: { top: 0, right: 0, bottom: 0, left: 2 },
        borderStyle: 'round',
        borderColor: '#743CFF',
        title: chalk.hex('#743CFF')('Need Help?'),
        titleAlignment: 'center',
      }),
    );
    return;
  }

  // Skip welcome message for interfaces commands
  const isInterfacesCommand = process.argv.includes('interfaces');
  const isOperationsCommand = process.argv.includes('operations');
  if (isInterfacesCommand || isOperationsCommand) {
    try {
      await program.parseAsync(process.argv);
      return;
    } catch (err: any) {
      console.error(chalk.red('Error: ') + (err.message || String(err)));
      process.exit(1);
    }
  }

  try {
    // Set the output format if specified in global options
    program.hook('preAction', () => {
      // Get options from the root command (global options)
      const globalOptions = program.opts();

      // Set the current profile if specified
      if (globalOptions.profile) {
        const availableProfiles = listProfiles();

        // Skip profile validation for login and configure commands since they can create profiles
        const isLoginCommand = process.argv.includes('login');
        const isConfigureCommand = process.argv.includes('configure');

        if (
          availableProfiles.includes(globalOptions.profile) ||
          isLoginCommand ||
          isConfigureCommand
        ) {
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

      // Set the API key if specified via command line
      if (globalOptions.apiKey) {
        process.env.XPANDER_CLI_API_KEY = globalOptions.apiKey;
      }

      // Set non-interactive mode if specified or detected
      if (
        globalOptions.yes ||
        globalOptions.noInteractive ||
        isNonInteractive()
      ) {
        process.env.XPANDER_NON_INTERACTIVE = 'true';
        process.env.XPANDER_YES = 'true';
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
          'Try running "xpander login" to update your API credentials.',
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
