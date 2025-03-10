import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';

import { validateApiKey } from '../utils/client';
import {
  // Comment out all unused imports
  // setApiKey,
  // getApiKey,
  getCurrentProfile,
  setCurrentProfile,
  listProfiles,
  createProfile,
} from '../utils/config';

/**
 * Configures the configure command
 */
export function configureConfigureCommand(program: Command): void {
  program
    .command('configure')
    .description('Configure your API credentials')
    .option('--key <api_key>', 'Your Xpander API key')
    .option('--org <organization_id>', 'Your Xpander organization ID')
    .option('--profile <profile>', 'Profile name to use')
    .option('--no-validate', 'Skip credential validation')
    .action(async (options) => {
      const shouldValidate = options.validate !== false;
      let profileName = options.profile || getCurrentProfile();

      // If profile is specified but doesn't exist, create it
      if (options.profile) {
        setCurrentProfile(options.profile);
        profileName = options.profile;
      }

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

      // Validate API key if requested
      let organizationId = options.org;
      if (shouldValidate) {
        const spinner = ora('Validating API key...').start();

        try {
          const isValid = await validateApiKey(apiKey);

          if (isValid) {
            spinner.succeed('API key validation successful');
          } else {
            spinner.warn(
              'API key validation failed, but configuration will continue',
            );
            console.log(
              chalk.yellow('You may encounter errors when using this API key.'),
            );
          }
        } catch (error: any) {
          spinner.warn(
            'API key validation failed, but configuration will continue',
          );
          console.log(chalk.yellow('Error during validation:'), error.message);
        }
      } else {
        console.log(chalk.yellow('Skipping credential validation.'));
        console.log(
          chalk.yellow(
            'Warning: Invalid credentials may cause API operations to fail.',
          ),
        );
      }

      // Get organization ID if not provided
      if (!organizationId) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'orgId',
            message: 'Enter your Xpander organization ID:',
            validate: (input) => {
              if (!input) return 'Organization ID is required';
              return true;
            },
          },
        ]);
        organizationId = answers.orgId;
      }

      // Save the credentials
      createProfile(profileName, apiKey, organizationId);

      console.log(chalk.green(`API key saved to profile "${profileName}".`));
      console.log(
        chalk.green(`Organization ID saved to profile "${profileName}".`),
      );
      console.log(
        chalk.green(`Successfully configured using profile "${profileName}".`),
      );
    });

  program
    .command('profile')
    .description('Manage profiles')
    .option('--list', 'List available profiles')
    .option('--switch <profile>', 'Switch to a different profile')
    .action((options) => {
      const currentProfile = getCurrentProfile();

      if (options.list) {
        const profiles = listProfiles();
        console.log(chalk.blue('Available profiles:'));

        profiles.forEach((profile: string) => {
          if (profile === currentProfile) {
            console.log(
              `  ${chalk.green('*')} ${profile} ${chalk.green('(current)')}`,
            );
          } else {
            console.log(`    ${profile}`);
          }
        });

        return;
      }

      if (options.switch) {
        setCurrentProfile(options.switch);
        console.log(chalk.green(`Switched to profile "${options.switch}"`));
        return;
      }

      // If no options provided, show current profile
      console.log(chalk.blue(`Current profile: ${chalk.bold(currentProfile)}`));
    });
}
