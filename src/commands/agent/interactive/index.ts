import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { createClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
import { displayAgentTable } from '../helpers/display';

/**
 * Interactive agent management mode
 */
export async function interactiveAgentMode() {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error(chalk.red('No API key found.'));
      console.error(
        chalk.yellow(
          'Please run "xpander configure" to set up your credentials.',
        ),
      );
      return;
    }

    // Display welcome banner
    console.log('');
    console.log(chalk.bold.cyan('🤖 Xpander Agent Management'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(
      chalk.blue('Interactive mode - Select agents and manage them with ease'),
    );
    console.log(chalk.dim('─'.repeat(60)));

    const client = createClient();

    // Main interactive loop
    let exitRequested = false;
    while (!exitRequested) {
      // Fetch agents
      const fetchSpinner = ora('Fetching your agents...').start();
      const agentsList = await client.getAgents();
      fetchSpinner.succeed('Agents loaded successfully');

      if (!agentsList || agentsList.length === 0) {
        console.log(chalk.yellow('\nNo agents found.'));

        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Create a new agent', value: 'create' },
              { name: 'Exit', value: 'exit' },
            ],
          },
        ]);

        if (action === 'create') {
          // Import dynamically to avoid circular dependencies
          const { createNewAgent } = await import('./create');
          await createNewAgent(client);
          continue;
        } else {
          exitRequested = true;
          continue;
        }
      }

      // Sort agents by creation date (newest first)
      const agents = [...agentsList].sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Display agents in a table
      displayAgentTable(agents);

      // Offer available actions
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'View agent details', value: 'view' },
            { name: 'Create a new agent', value: 'create' },
            { name: 'Update an agent', value: 'update' },
            { name: 'Delete agents (single or multiple)', value: 'delete' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'view': {
          // Import dynamically to avoid circular dependencies
          const { viewAgentDetails } = await import('./view');
          await viewAgentDetails(client, agents);
          break;
        }
        case 'create': {
          // Import dynamically to avoid circular dependencies
          const { createNewAgent } = await import('./create');
          await createNewAgent(client);
          break;
        }
        case 'update': {
          // Import dynamically to avoid circular dependencies
          const { updateExistingAgent } = await import('./update');
          await updateExistingAgent(client, agents);
          break;
        }
        case 'delete': {
          // Import dynamically to avoid circular dependencies
          const { deleteAgents } = await import('./delete');
          await deleteAgents(client, agents);
          break;
        }
        case 'exit':
          exitRequested = true;
          console.log(chalk.blue('\nExiting agent management. Goodbye!'));
          break;
      }

      // If not exiting, add a small pause between actions
      if (!exitRequested) {
        const { continue: shouldContinue } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continue',
            message: 'Return to main menu?',
            default: true,
          },
        ]);

        if (!shouldContinue) {
          exitRequested = true;
          console.log(chalk.blue('\nExiting agent management. Goodbye!'));
        }
      }
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error in interactive mode:'),
      error.message || String(error),
    );
  }
}
