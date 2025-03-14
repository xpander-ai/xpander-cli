import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { AgenticOperation } from '../types/agent/operation';
import { createClient } from '../utils/client';
import { getApiKey } from '../utils/config';

/**
 * Register interfaces commands
 */
export function configureInterfacesCommands(program: Command): void {
  const interfacesCmd = program
    .command('interfaces')
    .description('Manage agentic interfaces and operations')
    .option('--profile <name>', 'Profile to use');

  // Default action - show help
  interfacesCmd.action(() => {
    interfacesCmd.help();
  });

  // List interfaces command
  interfacesCmd
    .command('list')
    .description('List available agentic interfaces')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(
          options.profile || interfacesCmd.opts().profile,
        );
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const spinner = ora('Loading interfaces...').start();
        const client = createClient(
          options.profile || interfacesCmd.opts().profile,
        );
        const interfaces = await client.getAgenticInterfaces();
        spinner.stop();

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
  interfacesCmd
    .command('operations')
    .description('List operations for an agentic interface')
    .requiredOption('--interface <id>', 'Interface ID')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(
          options.profile || interfacesCmd.opts().profile,
        );
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(
          options.profile || interfacesCmd.opts().profile,
        );
        await displayOperations(client, options.interface);
      } catch (error: any) {
        console.error(
          chalk.red('Failed to retrieve operations:'),
          error.message || String(error),
        );
      }
    });
}

async function displayOperations(client: any, interfaceId: string) {
  const spinner = ora('Loading operations...').start();
  try {
    const operations = await client.getAgenticOperations(interfaceId);
    spinner.stop();

    if (operations.length === 0) {
      console.log(
        chalk.yellow(
          'No operations found for this interface. This could be because:\n' +
            '1. The interface has no operations defined\n' +
            '2. The operations API is temporarily unavailable\n' +
            '3. The interface ID is incorrect\n\n' +
            'Please verify the interface ID and try again.',
        ),
      );
      return;
    }

    console.log(chalk.green(`\nFound ${operations.length} operation(s):\n`));

    operations.forEach((op: AgenticOperation, index: number) => {
      console.log(chalk.cyan(`${index + 1}. ${op.name}`));
      if (op.summary) {
        console.log(chalk.gray(`   Summary: ${op.summary}`));
      }
      if (op.description) {
        console.log(chalk.gray(`   Description: ${op.description}`));
      }
      if (op.method && op.path) {
        console.log(
          chalk.gray(`   Endpoint: ${op.method.toUpperCase()} ${op.path}`),
        );
      }
      console.log(chalk.gray(`   ID: ${op.id}`));
      if (op.idToUseOnGraph) {
        console.log(chalk.gray(`   Graph ID: ${op.idToUseOnGraph}`));
      }
      console.log('');
    });
  } catch (error: any) {
    spinner.fail('Failed to load operations');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}
