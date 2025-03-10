import * as chalkModule from 'chalk';
const chalk = chalkModule;
import { Command } from 'commander';
import inquirer from 'inquirer';
import { Agent } from '../types';
import { createClient } from '../utils/client';
import {
  getOrganizationId,
  setLastUsedAgentId,
  getLastUsedAgentId,
} from '../utils/config';
import { formatOutput } from '../utils/formatter';

/**
 * Configure the agent commands
 */
export function agent(program: Command): void {
  const agentCommand = program
    .command('agent')
    .description('Manage your Xpander agents');

  // List all agents
  agentCommand
    .command('list')
    .description('List all your agents')
    .action(async () => {
      try {
        const orgId = getOrganizationId();
        if (!orgId) {
          console.error(
            chalk.red('Error: Organization ID is required for this operation.'),
          );
          console.error(
            chalk.blue(
              'Run "xpander configure --org YOUR_ORGANIZATION_ID" to set it.',
            ),
          );
          process.exit(1);
        }

        console.log(
          chalk.blue(`Fetching agents for organization ID: ${orgId}`),
        );

        const client = createClient();
        const response = await client.get(`/organizations/${orgId}/agents`);

        if (response.data && response.data.items) {
          if (response.data.items.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            console.log(
              chalk.blue('To create an agent, run "xpander agent new"'),
            );
            return;
          }

          // Format and display agents
          formatOutput(response.data.items, {
            title: 'Your Agents',
            columns: ['id', 'name', 'created_at', 'updated_at'],
            headers: ['ID', 'Name', 'Created', 'Updated'],
          });
        } else {
          console.log(chalk.yellow('No agents found.'));
        }
      } catch (error: any) {
        console.error(chalk.red('Error fetching agents:'), error.message);
        if (error.response?.status === 403) {
          console.error(
            chalk.yellow(
              'Make sure your organization ID is correct and you have access to it.',
            ),
          );
          console.error(
            chalk.blue(
              'Your organization ID must be valid for all operations.',
            ),
          );
          console.error(
            chalk.blue(
              'You can set it using: xpander configure --org YOUR_ORGANIZATION_ID',
            ),
          );
        }
        process.exit(1);
      }
    });

  // Get agent details
  agentCommand
    .command('get')
    .description('Get details about an agent')
    .option('-i, --id <agent_id>', 'Agent ID to get details for')
    .action(async (options) => {
      try {
        const orgId = getOrganizationId();
        if (!orgId) {
          console.error(
            chalk.red('Error: Organization ID is required for this operation.'),
          );
          console.error(
            chalk.blue(
              'Run "xpander configure --org YOUR_ORGANIZATION_ID" to set it.',
            ),
          );
          process.exit(1);
        }

        // Get agent ID from options or last used, or prompt the user
        let agentId = options.id || getLastUsedAgentId();

        if (!agentId) {
          try {
            // First try to list agents to let user select
            const client = createClient();
            const response = await client.get(`/organizations/${orgId}/agents`);

            if (
              response.data &&
              response.data.items &&
              response.data.items.length > 0
            ) {
              const answers = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'agentId',
                  message: 'Select an agent:',
                  choices: response.data.items.map((agentItem: Agent) => ({
                    name: `${agentItem.name} (${agentItem.id})`,
                    value: agentItem.id,
                  })),
                },
              ]);
              agentId = answers.agentId;
            } else {
              console.log(chalk.yellow('No agents found.'));
              console.log(
                chalk.blue('To create an agent, run "xpander agent new"'),
              );
              return;
            }
          } catch (error) {
            // If listing fails, just ask for the ID directly
            const answers = await inquirer.prompt([
              {
                type: 'input',
                name: 'agentId',
                message: 'Enter agent ID:',
                validate: (input) => {
                  if (!input) return 'Agent ID is required';
                  return true;
                },
              },
            ]);
            agentId = answers.agentId;
          }
        }

        // Save this agent ID for future use
        setLastUsedAgentId(agentId);

        // Get the agent details
        const client = createClient();
        const response = await client.get(
          `/organizations/${orgId}/agents/${agentId}`,
        );

        // Format and display the agent
        formatOutput(response.data, {
          title: 'Agent Details',
        });
      } catch (error: any) {
        console.error(chalk.red('Error fetching agent:'), error.message);
        process.exit(1);
      }
    });

  // Create new agent (stub for now)
  agentCommand
    .command('new')
    .description('Create a new agent')
    .action(async () => {
      console.log(chalk.yellow('This feature is not yet implemented.'));
      console.log(
        chalk.blue('Please check back later or use the web interface.'),
      );
    });
}

// Commenting out unused function to fix compilation error
// function isAgentActive(agentItem: Agent): boolean {
//   return agentItem.status === 'active';
// }
