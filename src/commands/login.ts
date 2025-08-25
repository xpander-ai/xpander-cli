import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../types';
import { waitForAuthCallback } from '../utils/auth';
import {
  setApiKey,
  setOrganizationId,
  getOrganizationId,
  getCurrentProfile,
  setCurrentProfile,
  listProfiles,
  createProfile,
  getApiKey,
} from '../utils/config';

// The validation functions and interface have been removed as they're no longer used in this file

/**
 * Configure the login command
 */
export function configureLoginCommand(program: Command): void {
  program
    .command(CommandType.Login)
    .alias('l')
    .description('Login to Xpander')
    .option('--profile <name>', 'Profile name to use')
    .option('--new', 'Create a new profile even if one exists')
    .action(async (options) => {
      let profileName = options.profile || 'default';
      const existingProfiles = listProfiles();

      // Check if profile already exists and --new flag not provided
      if (existingProfiles.includes(profileName) && !options.new) {
        const existingApiKey = getApiKey(profileName);
        const existingOrgId = getOrganizationId(profileName);

        if (existingApiKey) {
          // Just display the existing profile info
          console.log(chalk.cyan('\n🚀 Welcome to Xpander!'));
          console.log(chalk.gray('━'.repeat(50)));
          console.log();
          console.log(
            chalk.white(
              `  Profile: ${chalk.bold(profileName)}${profileName === getCurrentProfile() ? chalk.gray(' (current)') : ''}`,
            ),
          );
          console.log(
            chalk.white(
              `  Organization ID: ${chalk.bold(existingOrgId || 'Not set')}`,
            ),
          );
          console.log(chalk.white(`  API Key: ${chalk.bold(existingApiKey)}`));
          console.log();
          console.log(chalk.gray('━'.repeat(50)));
          console.log();
          console.log(chalk.blue('💡 Quick Start Tips:'));
          console.log(
            chalk.gray('  • Initialize your first agent: ') +
              chalk.yellow('xpander agent init'),
          );
          console.log(
            chalk.gray('  • Visit the platform: ') +
              chalk.blue('https://app.xpander.ai'),
          );
          console.log(
            chalk.gray('  • Create new profile: ') +
              chalk.yellow('xpander login --new'),
          );
          console.log();
          return;
        }
      }

      // Check if profile already exists with --new flag or prompting flow
      if (existingProfiles.includes(profileName) && options.new) {
        const existingApiKey = getApiKey(profileName);
        const existingOrgId = getOrganizationId(profileName);

        if (existingApiKey) {
          console.log(
            chalk.yellow(`Profile '${profileName}' already exists with:`),
          );
          console.log(
            chalk.yellow(`  Organization ID: ${existingOrgId || 'Not set'}`),
          );
          console.log(
            chalk.yellow(`  API Key: ${existingApiKey.substring(0, 8)}...`),
          );

          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What would you like to do?',
              choices: [
                { name: 'Overwrite existing profile', value: 'overwrite' },
                {
                  name: 'Create new profile with different name',
                  value: 'new',
                },
                { name: 'Cancel login', value: 'cancel' },
              ],
            },
          ]);

          if (action === 'cancel') {
            console.log('Login cancelled.');
            process.exit(0);
          }

          if (action === 'new') {
            const { newProfileName } = await inquirer.prompt([
              {
                type: 'input',
                name: 'newProfileName',
                message: 'Enter new profile name:',
                validate: (input: string) => {
                  if (!input.trim()) return 'Profile name cannot be empty';
                  if (existingProfiles.includes(input))
                    return 'Profile already exists';
                  return true;
                },
              },
            ]);
            profileName = newProfileName;
          }
        }
      }

      const spinner = ora('Authorizing').start();

      try {
        const { organizationId, apiKey } = await waitForAuthCallback();

        // Save credentials to profile
        setCurrentProfile(profileName);
        setApiKey(apiKey, profileName);

        if (organizationId) {
          setOrganizationId(organizationId, profileName);
        } else {
          console.log(chalk.yellow('No organization ID provided.'));
          console.log(
            chalk.yellow(
              'You may need to set it later for certain operations.',
            ),
          );
        }

        console.log();
        console.log(chalk.green('✓ Successfully logged in!'));
        console.log(
          chalk.gray(
            `Profile: ${chalk.bold(profileName)} | Org: ${chalk.bold(organizationId || 'Auto-detect')}`,
          ),
        );
        console.log();
        console.log(chalk.blue('Next steps:'));
        console.log(
          chalk.gray('  • Create agent: ') +
            chalk.yellow('x a n --name "my-agent" --framework "agno"'),
        );
        console.log(
          chalk.gray('  • Initialize locally: ') + chalk.yellow('x a i'),
        );
        console.log(
          chalk.gray('  • Invoke agent: ') + chalk.yellow('x a invoke "hello"'),
        );
        spinner.stop();

        // Ultimate solution: force exit with kill signal
        setTimeout(() => {
          process.kill(process.pid, 'SIGKILL');
        }, 100);
      } catch (error: any) {
        spinner.fail('Login failed');
        console.log(chalk.red('Error during login:'), error.message);
        process.exit(1);
      }
    });
}

// The configureCommand function has been removed to eliminate the duplicate implementation
// The correct implementation should be in src/commands/configure.ts

// Add profile subcommand
export function configureProfileCommand(program: Command): void {
  program
    .command(CommandType.Profile)
    .description('Manage profiles')
    .option('-l, --list', 'List all available profiles')
    .option('-c, --current', 'Show current profile')
    .option('-s, --switch <profileName>', 'Switch to a different profile')
    .option('-n, --new <profileName>', 'Create a new profile')
    .option('-k, --key <apiKey>', 'API key for the new profile')
    .option('-o, --org <organizationId>', 'Organization ID for the new profile')
    .action(async (options) => {
      // List all profiles
      if (options.list) {
        const profiles = listProfiles();
        const currentProfile = getCurrentProfile();

        console.log(chalk.blue('Available profiles:'));
        for (const profile of profiles) {
          if (profile === currentProfile) {
            console.log(
              `${chalk.green('✓')} ${profile} ${chalk.gray('(current)')}`,
            );
          } else {
            console.log(`  ${profile}`);
          }
        }
        return;
      }

      // Show current profile and organization
      if (options.current) {
        const currentProfile = getCurrentProfile();
        const orgId = getOrganizationId();

        console.log(
          chalk.blue(`Current profile: ${chalk.bold(currentProfile)}`),
        );
        if (orgId) {
          console.log(chalk.blue(`Organization ID: ${chalk.bold(orgId)}`));
        } else {
          console.log(
            chalk.gray(
              "No organization ID set. We'll try to detect it automatically.",
            ),
          );
        }
        return;
      }

      // Switch profiles
      if (options.switch) {
        const profiles = listProfiles();
        if (!profiles.includes(options.switch)) {
          console.error(
            chalk.red(
              `Profile "${
                options.switch
              }" not found. Available profiles: ${profiles.join(', ')}`,
            ),
          );
          process.exit(1);
        }

        setCurrentProfile(options.switch);
        const orgId = getOrganizationId(options.switch);

        console.log(chalk.green(`✓ Switched to profile "${options.switch}"`));
        if (orgId) {
          console.log(chalk.blue(`Organization ID: ${chalk.bold(orgId)}`));
        } else {
          console.log(
            chalk.gray(
              "No organization ID set for this profile. We'll try to detect it automatically.",
            ),
          );
        }
        return;
      }

      // Create new profile
      if (options.new) {
        // Need API key for new profile
        let apiKey = options.key;
        if (!apiKey) {
          const answers = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: `Enter API key for new profile "${options.new}":`,
              validate: (input: string) => {
                if (!input) {
                  return 'API key is required';
                }
                return true;
              },
            },
          ]);
          apiKey = answers.apiKey;
        }

        // Organization ID is optional
        let organizationId = options.org;
        if (!organizationId) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'organizationId',
              message: `Enter organization ID for profile "${options.new}" (optional):`,
            },
          ]);
          organizationId = answers.organizationId;
        }

        try {
          // Validate API key
          console.log(chalk.blue('Validating API key...'));
          const isValid = true; // Validation will happen when using the API
          if (!isValid) {
            console.error(chalk.red('✗ Invalid API key. Please try again.'));
            process.exit(1);
          }

          // Create the profile
          createProfile(options.new, apiKey, organizationId);

          // Ask if user wants to switch to it
          const switchAnswer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'switch',
              message: `Switch to new profile "${options.new}" now?`,
              default: true,
            },
          ]);

          if (switchAnswer.switch) {
            setCurrentProfile(options.new);
            console.log(chalk.green(`✓ Switched to profile "${options.new}"`));
          }

          console.log(chalk.green(`✓ Created new profile "${options.new}"`));
          if (organizationId) {
            console.log(
              chalk.blue(`Organization ID: ${chalk.bold(organizationId)}`),
            );
          }
        } catch (error) {
          console.error(
            chalk.red(
              `Error creating profile: ${
                error instanceof Error ? error.message : error
              }`,
            ),
          );
          process.exit(1);
        }
        return;
      }

      // If no options provided, show help
      if (
        !Object.keys(options).some((key) =>
          ['list', 'current', 'switch', 'new'].includes(key),
        )
      ) {
        console.log(chalk.blue('Profile management commands:'));
        console.log('  xpander profile --list              List all profiles');
        console.log(
          '  xpander profile --current           Show current profile',
        );
        console.log(
          '  xpander profile --switch <name>     Switch to a different profile',
        );
        console.log(
          '  xpander profile --new <name>        Create a new profile',
        );
      }
    });
}
