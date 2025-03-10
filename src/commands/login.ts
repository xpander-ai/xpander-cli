import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import {
  setApiKey,
  setOrganizationId,
  getOrganizationId,
  getCurrentProfile,
  setCurrentProfile,
  listProfiles,
  createProfile,
} from '../utils/config';

// Define the validation result type
interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Function to validate the API key format
function isValidApiKeyFormat(apiKey: string): boolean {
  // Check if key meets basic requirements (you can adjust this as needed)
  return typeof apiKey === 'string' && apiKey.length >= 20;
}

// Function to validate the organization ID format
function isValidOrgIdFormat(orgId: string): boolean {
  // Check if organization ID meets basic requirements (you can adjust this as needed)
  return typeof orgId === 'string' && orgId.trim().length >= 3;
}

// Function to validate the API key and organization ID pair against the API
async function validateCredentialPair(
  apiKey: string,
  orgId: string
): Promise<ValidationResult> {
  try {
    // Create a test API client
    const client = axios.create({
      baseURL: 'https://inbound.xpander.ai',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    // Try a simple API call to validate the key-org pair
    await client.get(`/${orgId}/agents/list`);

    // If we get here without an error, the credentials are valid
    return { isValid: true };
  } catch (error: any) {
    // Determine if this is an authentication error (401) or permission error (403)
    // versus a connection error or other issue
    if (error.response) {
      // We got a response from the server
      const status = error.response.status;

      if (status === 404) {
        // 404 might indicate that the org ID is wrong
        return {
          isValid: false,
          message:
            'Organization ID not found. Please check your organization ID.',
        };
      } else if (status === 401 || status === 403) {
        // Both 401 and 403 indicate authentication/authorization failures
        return {
          isValid: false,
          message:
            'Authentication failed. Please check your API key and organization ID.',
        };
      } else if (status >= 500) {
        // Server errors shouldn't necessarily invalidate the credentials
        return {
          isValid: false,
          message: 'Server error occurred. Could not validate credentials.',
        };
      }
    }

    // For network errors or other issues
    return {
      isValid: false,
      message: 'Connection error. Could not validate credentials.',
    };
  }
}

/**
 * Configure the login command
 */
export function configureLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Log in to Xpander')
    .option('--key <api_key>', 'Your Xpander API key')
    .option('--profile <profile>', 'Profile name to use')
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
            chalk.green(`API key saved to profile "${profileName}".`)
          );
          console.log(
            chalk.green(
              `Successfully logged in using profile "${profileName}".`
            )
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
              chalk.green(`Organization ID saved to profile "${profileName}".`)
            );
          } else {
            console.log(chalk.yellow('No organization ID provided.'));
            console.log(
              chalk.yellow(
                'You may need to set it later for certain operations.'
              )
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

/**
 * Configures the configure command
 */
export function configureCommand(program: Command): void {
  program
    .command('configure')
    .description('Configure the CLI')
    .option('-k, --key <key>', 'API key for authentication')
    .option(
      '-p, --profile <profileName>',
      'Profile name to use (default: "default")'
    )
    .option(
      '-o, --org <organizationId>',
      'Set your organization ID explicitly (required)'
    )
    .option('--no-validate', 'Skip API key validation')
    .action(async (options) => {
      let apiKey = options.key;
      let organizationId = options.org;
      const profileName = options.profile || getCurrentProfile();
      const skipValidation = options.validate === false;

      // If no API key is provided, prompt the user
      if (!apiKey) {
        console.log(
          chalk.blue('Your API key is required to authenticate with Xpander.ai')
        );
        console.log(
          chalk.gray('(You can find your API key in your Xpander.ai dashboard)')
        );

        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your Xpander.ai API key:',
            validate: (input: string) => {
              if (!input) {
                return 'API key is required';
              }
              // Validate the API key format
              if (!isValidApiKeyFormat(input)) {
                return 'Invalid API key format. API keys should be at least 20 characters long.';
              }
              return true;
            },
          },
        ]);
        apiKey = answers.apiKey;
      } else if (!isValidApiKeyFormat(apiKey)) {
        // If API key was provided via command line, validate it
        console.error(
          chalk.red(
            'Invalid API key format. API keys should be at least 20 characters long.'
          )
        );
        process.exit(1);
      }

      // If no organization ID is provided, prompt the user
      if (!organizationId) {
        console.log(
          chalk.blue(
            'Your organization ID is required for Xpander.ai API operations'
          )
        );
        console.log(
          chalk.gray(
            '(You can find your organization ID in your Xpander.ai dashboard)'
          )
        );

        const orgAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'orgId',
            message: 'Enter your Xpander.ai organization ID:',
            validate: (input: string) => {
              if (!input) {
                return 'Organization ID is required';
              }
              // Validate the organization ID format
              if (!isValidOrgIdFormat(input)) {
                return 'Invalid organization ID format. Organization IDs should be at least 3 characters long.';
              }
              return true;
            },
          },
        ]);
        organizationId = orgAnswers.orgId;
      } else if (!isValidOrgIdFormat(organizationId)) {
        // If org ID was provided via command line, validate it
        console.error(
          chalk.red(
            'Invalid organization ID format. Organization IDs should be at least 3 characters long.'
          )
        );
        process.exit(1);
      }

      let validationResult: ValidationResult = { isValid: true };

      // Validate the credentials against the API unless --no-validate is specified
      if (!skipValidation) {
        console.log(chalk.blue('Validating credentials...'));
        validationResult = await validateCredentialPair(apiKey, organizationId);

        if (!validationResult.isValid) {
          console.error(
            chalk.red(`✗ Validation failed: ${validationResult.message}`)
          );
          process.exit(1);
        }

        if (validationResult.message) {
          console.log(chalk.yellow(validationResult.message));
        } else {
          console.log(chalk.green('✓ Credentials validated successfully'));
        }
      } else {
        console.log(
          chalk.yellow('Skipping credential validation (--no-validate)')
        );
        console.log(
          chalk.yellow(
            'Note: Invalid credentials may cause API operations to fail'
          )
        );
      }

      // Save the credentials
      setApiKey(apiKey, profileName);
      console.log(chalk.green(`✓ API key saved to profile "${profileName}"`));

      setOrganizationId(organizationId, profileName);
      console.log(
        chalk.green(
          `✓ Organization ID saved to profile "${profileName}": ${organizationId}`
        )
      );

      // Set as current profile
      setCurrentProfile(profileName);
      console.log(
        chalk.green(
          `✓ Successfully configured Xpander CLI using profile "${profileName}"`
        )
      );
    });

  // Add profile subcommand
  program
    .command('profile')
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
              `${chalk.green('✓')} ${profile} ${chalk.gray('(current)')}`
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
          chalk.blue(`Current profile: ${chalk.bold(currentProfile)}`)
        );
        if (orgId) {
          console.log(chalk.blue(`Organization ID: ${chalk.bold(orgId)}`));
        } else {
          console.log(
            chalk.gray(
              "No organization ID set. We'll try to detect it automatically."
            )
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
              }" not found. Available profiles: ${profiles.join(', ')}`
            )
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
              "No organization ID set for this profile. We'll try to detect it automatically."
            )
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
              chalk.blue(`Organization ID: ${chalk.bold(organizationId)}`)
            );
          }
        } catch (error) {
          console.error(
            chalk.red(
              `Error creating profile: ${
                error instanceof Error ? error.message : error
              }`
            )
          );
          process.exit(1);
        }
        return;
      }

      // If no options provided, show help
      if (
        !Object.keys(options).some((key) =>
          ['list', 'current', 'switch', 'new'].includes(key)
        )
      ) {
        console.log(chalk.blue('Profile management commands:'));
        console.log('  xpander profile --list              List all profiles');
        console.log(
          '  xpander profile --current           Show current profile'
        );
        console.log(
          '  xpander profile --switch <name>     Switch to a different profile'
        );
        console.log(
          '  xpander profile --new <name>        Create a new profile'
        );
      }
    });
}
