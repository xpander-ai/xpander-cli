import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { startAgent } from './dev';
import { CommandType } from '../../../types';
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
            type: CommandType.List,
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Create a new agent', value: CommandType.Create },
              { name: 'Exit', value: CommandType.Exit },
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
          type: CommandType.List,
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'View agent details', value: CommandType.View },
            { name: 'Create a new agent', value: CommandType.Create },
            {
              name: 'Initialize existing agent',
              value: CommandType.Initialize,
            },
            { name: 'Update an agent', value: CommandType.Update },
            {
              name: 'Manage agent tools & interfaces',
              value: CommandType.Tools,
            },
            {
              name: 'Delete agents (single or multiple)',
              value: CommandType.Delete,
            },
            {
              name: 'Deploy your agent',
              value: CommandType.Deploy,
            },
            {
              name: 'Start your agent in debug mode',
              value: CommandType.Dev,
            },
            {
              name: 'View Logs',
              value: CommandType.Logs,
            },
            { name: 'Exit', value: CommandType.Exit },
          ],
        },
      ]);

      switch (action) {
        case CommandType.View: {
          // Import dynamically to avoid circular dependencies
          const { viewAgentDetails } = await import('./view');
          await viewAgentDetails(client, agents);
          break;
        }
        case CommandType.Create: {
          // Import dynamically to avoid circular dependencies
          const { createNewAgent } = await import('./create');
          await createNewAgent(client);
          break;
        }
        case CommandType.Update: {
          // Import dynamically to avoid circular dependencies
          const { updateExistingAgent } = await import('./update');
          await updateExistingAgent(client, agents);
          break;
        }
        case CommandType.Delete: {
          // Import dynamically to avoid circular dependencies
          const { deleteAgents } = await import('./delete');
          await deleteAgents(client, agents);
          break;
        }
        case CommandType.Tools: {
          // Import dynamically to avoid circular dependencies
          const { manageAgentTools } = await import('./tools');
          await manageAgentTools(client, agents);
          break;
        }
        case CommandType.Initialize: {
          // Import dynamically to avoid circular dependencies
          const { initializeAgent } = await import('./initialize');
          await initializeAgent(client);
          break;
        }
        case CommandType.Deploy: {
          // Import dynamically to avoid circular dependencies
          const { deployAgent } = await import('./deploy');
          await deployAgent(client);
          break;
        }
        case CommandType.Logs: {
          // Import dynamically to avoid circular dependencies
          const { getAgentLogs } = await import('./logs');
          await getAgentLogs(client);
          break;
        }
        case CommandType.Exit:
          exitRequested = true;
          console.log(chalk.blue('\nExiting agent management. Goodbye!'));
          break;

        case CommandType.Dev:
          await startAgent();
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
