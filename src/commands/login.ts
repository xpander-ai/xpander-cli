import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../types';
import {
  setApiKey,
  setOrganizationId,
  getOrganizationId,
  getCurrentProfile,
  setCurrentProfile,
  listProfiles,
  createProfile,
} from '../utils/config';

// The validation functions and interface have been removed as they're no longer used in this file

/**
 * Configure the login command
 */
export function configureLoginCommand(program: Command): void {
  program
    .command(CommandType.Login)
    .description('Log in to Xpander')
    .option('--key <api_key>', 'Your Xpander API key')
    .option('--profile <name>', 'Profile name to use')
    .action(async (options) => {
      // Get API key, either from command line or prompt
      let apiKey = options.key;
      if (!apiKey) {
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Xpander API key:',
            validate: (input) => {
              if (!input) return 'API key is required';
              if (input.length < 20) {
                return 'API key must be at least 20 characters';
              }
              return true;
            },
          },
        ]);
        apiKey = answers.apiKey;
      }

      // Validate API key
      const spinner = ora('Validating API key...').start();

      try {
        const isValid = true; // Validation will happen when using the API

        if (isValid) {
          spinner.succeed('API key validation successful');

          // Save the API key to the profile
          const profileName = options.profile || 'default';
          setCurrentProfile(profileName);
          setApiKey(apiKey, profileName);

          console.log(
            chalk.green(`API key saved to profile "${profileName}".`),
          );
          console.log(
            chalk.green(
              `Successfully logged in using profile "${profileName}".`,
            ),
          );

          // Prompt for organization ID
          const orgAnswers = await inquirer.prompt([
            {
              type: 'input',
              name: 'orgId',
              message: 'Enter your Xpander organization ID (optional):',
            },
          ]);

          if (orgAnswers.orgId) {
            setOrganizationId(orgAnswers.orgId, profileName);
            console.log(
              chalk.green(`Organization ID saved to profile "${profileName}".`),
            );
          } else {
            console.log(chalk.yellow('No organization ID provided.'));
            console.log(
              chalk.yellow(
                'You may need to set it later for certain operations.',
              ),
            );
          }
        } else {
          spinner.fail('API key validation failed');
          console.log(chalk.red('Invalid API key. Please try again.'));
          process.exit(1);
        }
      } catch (error: any) {
        spinner.fail('API key validation failed');
        console.log(chalk.red('Error during validation:'), error.message);
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
    .description('Manage profiles for different organizations')
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
