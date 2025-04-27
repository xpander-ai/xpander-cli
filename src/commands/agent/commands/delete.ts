import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType } from '../../../types';
import { createClient } from '../../../utils/client';

/**
 * Register delete command
 */
export function registerDeleteCommand(agentCmd: Command): void {
  // Delete an agent
  agentCmd
    .command(CommandType.Delete)
    .description('Delete an agent')
    .requiredOption('--id <agent_id>', 'ID of the agent to delete')
    .option('--confirm', 'Skip confirmation prompt')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          // Create a spinner for better visual feedback
          const loadingSpinner = process.stdout.isTTY
            ? ora({
                text: chalk.blue('Loading available agents...'),
                spinner: 'dots',
              }).start()
            : { succeed: console.log, fail: console.error, stop: () => {} };

          const client = createClient();
          const agents = await client.getAgents();

          loadingSpinner.stop();

          if (agents.length === 0) {
            console.log('\n' + chalk.yellow('✨ No agents found.'));
            return;
          }

          console.log('\n');
          console.log(chalk.bold.red('⚠️ Delete Agent'));
          console.log(chalk.dim('─'.repeat(50)));
          console.log(
            chalk.yellow('Please select the agent you wish to delete:'),
          );

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} ${chalk.dim(`(${agentItem.id})`)}`,
            value: (agentId = agentItem.id),
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Which agent would you like to delete?',
              choices,
              pageSize: 15,
            },
          ]);

          agentId = answers.agentId;
        }

        // Get agent details for confirmation
        const client = createClient(options.profile);
        const agentData = await client.getAgent(agentId);

        if (!agentData) {
          console.log(
            '\n' + chalk.yellow(`⚠️ Agent with ID ${agentId} not found.`),
          );
          return;
        }

        // Show warning with agent details
        console.log('\n');
        console.log(chalk.bold.red('🗑️ Delete Confirmation'));
        console.log(chalk.dim('─'.repeat(50)));
        console.log(
          chalk.yellow('You are about to delete the following agent:'),
        );
        console.log('\n');
        console.log(chalk.bold('Name:     ') + chalk.cyan(agentData.name));
        console.log(chalk.bold('ID:       ') + chalk.dim(agentData.id));
        if ('icon' in agentData && agentData.icon) {
          console.log(chalk.bold('Icon:     ') + agentData.icon);
        }
        console.log('\n');
        console.log(chalk.red('⚠️ This action cannot be undone!'));
        console.log(chalk.dim('─'.repeat(50)));

        // Confirm deletion
        const confirmation = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to permanently delete this agent?`,
            default: false,
          },
        ]);

        if (!confirmation.confirmed) {
          console.log(
            chalk.blue('\n✓ Operation cancelled. Agent was not deleted.'),
          );
          return;
        }

        // Create a spinner for deletion
        const spinner = process.stdout.isTTY
          ? ora({
              text: chalk.blue(`Deleting agent...`),
              spinner: 'dots',
            }).start()
          : { succeed: console.log, fail: console.error, stop: () => {} };

        const success = await client.deleteAgent(agentId);

        if (success) {
          spinner.succeed(chalk.green(`Agent deleted successfully!`));
        } else {
          spinner.fail(
            chalk.yellow(`Could not delete agent. Please try again.`),
          );
        }
      } catch (error: any) {
        if (error.status === 403) {
          console.error(
            chalk.red(
              'Authorization error: You lack permission for this action.',
            ),
          );
          console.error(
            chalk.yellow('Check your API key with "xpander profile --verify"'),
          );
        } else if (error.status === 404) {
          console.error(chalk.red(`Agent with ID "${options.id}" not found.`));
        } else {
          console.error(
            chalk.red('Error deleting agent:'),
            error.message || String(error),
          );
        }
      }
    });
}
