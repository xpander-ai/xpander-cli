import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../../../types';
import { XpanderClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
import { initializeAgent } from '../interactive/initialize';

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
    .action(async (options) => {
      try {
        let { name, profile } = options as {
          name?: string;
          profile?: string;
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

        const { shouldInitialize } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldInitialize',
            message:
              'Do you want to load this agent into your current workdir?',
            default: true,
          },
        ]);
        if (shouldInitialize) {
          await initializeAgent(client, createdAgent.id);
        }
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
