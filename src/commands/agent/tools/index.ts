import chalk from 'chalk';
import { Command } from 'commander';
import { displayOperations } from './operations';
import { CommandType } from '../../../types';
import { createClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
export { attachOperationsInteractive } from './operations-interactive';

export function configureToolsCommands(agentCmd: Command): void {
  const toolsCmd = agentCmd
    .command(CommandType.Tools)
    .description('Manage agentic interfaces and operations');

  // List interfaces for agents
  toolsCmd
    .command(CommandType.Interfaces)
    .description('List available agentic interfaces')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);
        const interfaces = await client.getAgenticInterfaces();

        if (interfaces.length === 0) {
          console.log(chalk.yellow('No agentic interfaces available.'));
          return;
        }

        console.log('');
        console.log(chalk.cyan('Available Interfaces:'));
        console.log('');

        interfaces.forEach((iface: any) => {
          console.log(
            `${chalk.bold(iface.name)} ${chalk.dim(`(${iface.id})`)}`,
          );
          console.log(
            chalk.dim(iface.description || 'No description available'),
          );
          console.log('');
        });
      } catch (error: any) {
        console.error(
          chalk.red('Failed to retrieve interfaces:'),
          error.message || String(error),
        );
      }
    });

  // List operations for an interface
  toolsCmd
    .command(CommandType.Operations)
    .description('List operations for an agentic interface')
    .option('--interface <id>', 'Interface ID')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);
        await displayOperations(client, options.interface);
      } catch (error: any) {
        console.error(
          chalk.red('Failed to retrieve operations:'),
          error.message || String(error),
        );
      }
    });
}
