import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../../../types';
import { XpanderClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';

/**
 * Register new command to create agents
 */
export function registerNewCommand(agentCmd: Command): void {
  // Create a new agent
  agentCmd
    .command(CommandType.New)
    .description('Create a new agent')
    .option('--name <name>', 'Name for the new agent')
    .option('--model <model>', 'Model to use (default: gpt-4o)')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output result in JSON format')
    .option('--skip-details', 'Skip the personalization step')
    .action(async (options) => {
      try {
        let { name, profile, skipDetails } = options as {
          name?: string;
          profile?: string;
          skipDetails?: boolean;
        };

        const apiKey = getApiKey(profile);
        if (!apiKey) {
          console.error(
            chalk.red(
              'No API key found. Please run `xpander configure` first.',
            ),
          );
          process.exit(1);
        }

        // If no name provided, prompt for it
        if (!name) {
          // Create a more appealing welcome screen
          console.log('\n');
          console.log(chalk.bold.blue('✨ Agent Creation Wizard ✨'));
          console.log(chalk.dim('─'.repeat(50)));
          console.log(
            chalk.yellow('Create a powerful AI agent for your organization'),
          );
          console.log(chalk.dim('─'.repeat(50)));
          console.log('\n');

          const nameAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'agentName',
              message: 'What name would you like for your agent?',
              validate: (input) => {
                if (!input.trim()) return 'Name is required';
                return true;
              },
            },
          ]);

          name = nameAnswer.agentName;

          // Since we're in interactive mode, ensure we collect all details
          skipDetails = false;
        }

        // At this point, name should always be defined
        if (!name) {
          throw new Error('Agent name is required');
        }

        // Create a spinner for better visual feedback
        const spinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue(`Creating agent "${name}"...`),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const client = new XpanderClient(apiKey, undefined, profile);
        let createdAgent = await client.createAgent(name);

        // Update spinner on success
        spinner.succeed(chalk.green(`Agent "${name}" created successfully!`));
        console.log('\n');

        // If not skipping details, prompt for additional information
        if (!skipDetails) {
          const updateAnswers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'wantToUpdate',
              message: 'Would you like to personalize your agent?',
              default: true,
            },
          ]);

          if (updateAnswers.wantToUpdate) {
            console.log(chalk.dim('─'.repeat(50)));
            console.log(chalk.blue.bold('🪄 Personalizing Your Agent'));
            console.log(chalk.dim('─'.repeat(50)));

            const details = await inquirer.prompt([
              {
                type: 'input',
                name: 'icon',
                message: 'Choose an icon for your agent:',
                default: '🤖',
              },
              {
                type: 'input',
                name: 'roleInstructions',
                message: 'What role should your agent perform?',
                default: '',
              },
              {
                type: 'input',
                name: 'goalInstructions',
                message: 'What is the main goal of your agent?',
                default: '',
              },
              {
                type: 'input',
                name: 'generalInstructions',
                message: 'Any additional instructions for your agent?',
                default: '',
              },
            ]);

            // Update the agent with additional details
            const updateSpinner = process.stdout.isTTY
              ? ora({
                  text: chalk.blue('Applying personalization...'),
                  spinner: 'dots',
                }).start()
              : { succeed: console.log, fail: console.error, stop: () => {} };

            const updateData: {
              icon?: string;
              instructions?: { role?: string; goal?: string; general?: string };
            } = {
              icon: details.icon,
              instructions: {
                role: details.roleInstructions || undefined,
                goal: details.goalInstructions || undefined,
                general: details.generalInstructions || undefined,
              },
            };

            // Only include instructions if at least one field is filled
            if (
              !details.roleInstructions &&
              !details.goalInstructions &&
              !details.generalInstructions
            ) {
              updateData.instructions = undefined;
            }

            const updatedAgent = await client.updateAgent(
              createdAgent.id,
              updateData,
            );

            if (updatedAgent) {
              createdAgent = updatedAgent;
              updateSpinner.succeed(chalk.green('Personalization complete!'));
            } else {
              updateSpinner.fail(
                chalk.yellow(
                  'Could not apply personalization, but agent was created.',
                ),
              );
            }
          }
        }

        // Deploy the agent
        const deploySpinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue('Deploying your agent...'),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        await client.deployAgent(createdAgent.id);
        deploySpinner.succeed(chalk.green('Agent deployed successfully!'));

        console.log('\n');
        console.log(chalk.bold.blue('🚀 Your Agent is Ready!'));
        console.log(chalk.dim('─'.repeat(50)));

        // Display final agent details in a cleaner format
        console.log(chalk.bold('Name:     ') + chalk.cyan(createdAgent.name));

        console.log(chalk.bold('ID:       ') + chalk.dim(createdAgent.id));

        if ('icon' in createdAgent && createdAgent.icon) {
          console.log(chalk.bold('Icon:     ') + createdAgent.icon);
        }

        console.log(
          chalk.bold('Model:    ') +
            chalk.yellow(
              `${createdAgent.model_provider}/${createdAgent.model_name}`,
            ),
        );

        // Show instructions if available in a cleaner format
        if (
          createdAgent.instructions &&
          (createdAgent.instructions.role ||
            createdAgent.instructions.goal ||
            createdAgent.instructions.general)
        ) {
          console.log('\n' + chalk.bold('Instructions:'));

          if (createdAgent.instructions.role) {
            console.log(
              chalk.bold('• Role:    ') + createdAgent.instructions.role,
            );
          }

          if (createdAgent.instructions.goal) {
            console.log(
              chalk.bold('• Goal:    ') + createdAgent.instructions.goal,
            );
          }

          if (createdAgent.instructions.general) {
            console.log(
              chalk.bold('• General: ') + createdAgent.instructions.general,
            );
          }
        }

        console.log(chalk.dim('─'.repeat(50)));
        console.log(chalk.green.bold('\n✅ Agent creation complete!\n'));
      } catch (error: any) {
        if (error.status === 403) {
          console.error(chalk.red('❌ Failed to create agent:'));
          console.error(chalk.red('Error code: 403'));
          console.error(chalk.red('Message: Access denied'));

          console.error('');
          console.error(chalk.red('❌ Error creating agent:'));
          console.error(chalk.red('Failed to create agent'));
        } else {
          console.error(
            chalk.red('❌ Error creating agent:'),
            error.message || String(error),
          );
        }
      }
    });
}
