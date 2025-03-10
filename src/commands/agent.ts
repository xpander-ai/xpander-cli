import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { createClient } from '../utils/client';
import { getOrganizationId } from '../utils/config';
import { formatOutput } from '../utils/formatter';

/**
 * Configure agent-related commands
 */
export function agent(program: Command): void {
  const agentCommand = program.command('agent').description('Manage agents');

  // List agents
  agentCommand
    .command('list')
    .description('List all agents')
    .option('--output <format>', 'Output format (json, table)')
    .action(async (cmdOptions) => {
      try {
        const client = createClient();

        // Instead of using client.get directly, use the getAgents method from XpanderClient
        const agents = await client.getAgents();

        if (agents.length === 0) {
          console.log(chalk.yellow('No agents found.'));
          return;
        }

        // Prepare agents data with formatted fields for better display
        const formattedAgents = agents.map((agentItem) => {
          // Format the date properly
          let createdDate = '';
          try {
            createdDate = new Date(agentItem.created_at).toLocaleDateString();
          } catch (e) {
            // If date parsing fails, use the raw value
            createdDate = agentItem.created_at || '';
          }

          // Process data for better table display
          return {
            id: agentItem.id.substring(0, 8) + '...', // Show shorter ID for better readability
            name: agentItem.name,
            description: agentItem.description
              ? agentItem.description.substring(0, 30) +
                (agentItem.description.length > 30 ? '...' : '')
              : '',
            status: agentItem.status,
            type: agentItem.type || '',
            model: agentItem.model_name || '',
            created_at: createdDate,
            tools_count: agentItem.tools ? agentItem.tools.length : 0,
            is_ai_employee: agentItem.is_ai_employee ? 'Yes' : 'No',
          };
        });

        // Format and display agents
        formatOutput(cmdOptions.output === 'json' ? agents : formattedAgents, {
          title: 'Your Agents',
          columns: [
            'id',
            'name',
            'description',
            'status',
            'type',
            'model',
            'created_at',
            'tools_count',
            'is_ai_employee',
          ],
          headers: [
            'ID',
            'Name',
            'Description',
            'Status',
            'Type',
            'Model',
            'Created',
            'Tools',
            'AI Employee',
          ],
          format: cmdOptions.output, // Pass the output format option
        });
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Get agent details
  agentCommand
    .command('get')
    .description('Get details about an agent')
    .option('--id <id>', 'Agent ID')
    .action(async (options) => {
      try {
        // Get the organization ID
        const orgId = getOrganizationId();
        if (!orgId) {
          console.error(
            chalk.red(
              'Organization ID not set. Run "xpander configure --org YOUR_ORG_ID" first.',
            ),
          );
          return;
        }

        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          console.log(
            chalk.blue(`Fetching agents for organization ID: ${orgId}`),
          );

          const client = createClient();
          // Instead of using client.get directly, use the getAgents method from XpanderClient
          const agents = await client.getAgents();

          if (agents.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            return;
          }

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} (${agentItem.id})`,
            value: agentItem.id,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Select an agent:',
              choices,
            },
          ]);

          agentId = answers.agentId;
        }

        console.log(chalk.blue(`Fetching details for agent: ${agentId}`));

        const client = createClient();
        // Instead of using client.get directly, use the getAgent method from XpanderClient
        const agentData = await client.getAgent(agentId);

        if (!agentData) {
          console.log(chalk.yellow(`Agent with ID ${agentId} not found.`));
          return;
        }

        // Format and display agent details
        formatOutput(agentData, {
          title: 'Agent Details',
        });
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Create a new agent
  agentCommand
    .command('new')
    .description('Create a new agent')
    .option('--name <name>', 'Agent name')
    .action(async (options) => {
      try {
        let name = options.name;

        // If no name provided, prompt user
        if (!name) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'agentName',
              message: 'Enter a name for the new agent:',
              validate: (input) => {
                if (!input) return 'Agent name is required';
                return true;
              },
            },
          ]);

          name = answers.agentName;
        }

        console.log(chalk.blue(`Creating new agent: ${name}`));

        const client = createClient();
        // Instead of creating the agent with an API call, use the createAgent method from XpanderClient
        const newAgent = await client.createAgent(name);

        console.log(chalk.green(`Agent "${name}" created successfully!`));
        // Format and display agent details
        formatOutput(newAgent, {
          title: 'New Agent Details',
        });
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });

  // Delete an agent
  agentCommand
    .command('delete')
    .description('Delete an agent')
    .option('--id <id>', 'Agent ID')
    .action(async (options) => {
      try {
        let agentId = options.id;

        // If no ID provided, prompt user to select from available agents
        if (!agentId) {
          const client = createClient();
          // Instead of using client.get directly, use the getAgents method from XpanderClient
          const agents = await client.getAgents();

          if (agents.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            return;
          }

          const choices = agents.map((agentItem) => ({
            name: `${agentItem.name} (${agentItem.id})`,
            value: agentItem.id,
          }));

          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Select an agent to delete:',
              choices,
            },
          ]);

          agentId = answers.agentId;
        }

        // Confirm deletion
        const confirmation = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Are you sure you want to delete agent ${agentId}?`,
            default: false,
          },
        ]);

        if (!confirmation.confirmed) {
          console.log(chalk.blue('Operation cancelled.'));
          return;
        }

        console.log(chalk.blue(`Deleting agent: ${agentId}`));

        const client = createClient();
        // Instead of deleting with an API call, use the deleteAgent method from XpanderClient
        const success = await client.deleteAgent(agentId);

        if (success) {
          console.log(chalk.green(`Agent ${agentId} deleted successfully!`));
        } else {
          console.log(
            chalk.yellow(
              `Could not delete agent ${agentId}. Please try again.`,
            ),
          );
        }
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
      }
    });
}

// Commenting out unused function to fix compilation error
// function isAgentActive(agentItem: Agent): boolean {
//   return agentItem.status === 'active';
// }
