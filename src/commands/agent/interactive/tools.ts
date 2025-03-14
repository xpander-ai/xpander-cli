import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { Agent } from '../../../types';
import { XpanderClient } from '../../../utils/client';
import { attachOperationsInteractive } from '../tools/operations-interactive';

/**
 * Interactive agent tools management
 */
export async function manageAgentTools(client: XpanderClient, agents: Agent[]) {
  try {
    // Let user select which agent to manage
    const { selectedAgentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgentId',
        message: 'Select an agent to manage tools for:',
        choices: agents.map((agent) => ({
          name: `${agent.name} (${agent.id})`,
          value: agent.id,
          short: agent.name,
        })),
      },
    ]);

    // Get the selected agent
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) {
      console.log(chalk.red('Agent not found.'));
      return;
    }

    console.log('');
    console.log(
      chalk.cyan(`Managing tools for agent: ${chalk.bold(agent.name)}`),
    );
    console.log('');

    // Show tools management menu
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'View available interfaces', value: 'view_interfaces' },
          { name: 'Attach tools to agent', value: 'attach_tools' },
          { name: 'View agent graph', value: 'view_graph' },
          { name: 'Return to main menu', value: 'back' },
        ],
      },
    ]);

    switch (action) {
      case 'view_interfaces': {
        const spinner = ora('Loading interfaces...').start();
        const interfaces = await client.getAgenticInterfaces();
        spinner.stop();

        if (interfaces.length === 0) {
          console.log(chalk.yellow('No agentic interfaces available.'));
          return;
        }

        console.log('');
        console.log(chalk.cyan('Available Interfaces:'));
        console.log('');

        interfaces.forEach((iface, index) => {
          console.log(
            `${chalk.bold(index + 1)}. ${chalk.bold(iface.name)} ${chalk.dim(`(${iface.id})`)}`,
          );
          console.log(
            chalk.dim(iface.description || 'No description available'),
          );
          console.log('');
        });

        // Let user view operations for an interface
        const { viewOperations } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'viewOperations',
            message: 'Would you like to view operations for an interface?',
            default: false,
          },
        ]);

        if (viewOperations) {
          const { selectedInterface } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedInterface',
              message: 'Select an interface:',
              choices: interfaces.map((iface) => ({
                name: `${iface.name} (${iface.id})`,
                value: iface.id,
                short: iface.name,
              })),
            },
          ]);

          const operationsSpinner = ora('Loading operations...').start();
          const operations =
            await client.getAgenticOperations(selectedInterface);
          operationsSpinner.stop();

          if (operations.length === 0) {
            console.log(
              chalk.yellow('No operations available for this interface.'),
            );
            return;
          }

          console.log('');
          console.log(chalk.cyan('Available Operations:'));
          console.log('');

          operations.forEach((op, index) => {
            console.log(chalk.cyan(`${index + 1}. ${op.name}`));
            if (op.summary) {
              console.log(chalk.gray(`   Summary: ${op.summary}`));
            }
            if (op.description) {
              console.log(chalk.gray(`   Description: ${op.description}`));
            }
            if (op.method && op.path) {
              console.log(
                chalk.gray(
                  `   Endpoint: ${op.method.toUpperCase()} ${op.path}`,
                ),
              );
            }
            console.log(chalk.gray(`   ID: ${op.id}`));
            if (op.idToUseOnGraph) {
              console.log(chalk.gray(`   Graph ID: ${op.idToUseOnGraph}`));
            }
            console.log('');
          });
        }
        break;
      }
      case 'attach_tools': {
        await attachOperationsInteractive(client, selectedAgentId);
        break;
      }
      case 'view_graph': {
        // Show graph placeholder
        console.log(chalk.yellow('Graph visualization coming soon!'));
        break;
      }
      case 'back':
        return;
    }
  } catch (error: any) {
    console.error(chalk.red('Error managing tools:'), error.message);
  }
}
