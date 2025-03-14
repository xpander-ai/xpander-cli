import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { interactiveOperationsMode } from './interactive';
import { AgenticOperation } from '../../types/agent/operation';
import { createClient } from '../../utils/client';
import { getApiKey } from '../../utils/config';
import { exploreInterfaces } from '../interfaces/explorer';

/**
 * Register operations command
 */
export function configureOperationsCommand(program: Command): Command {
  const operationsCmd = program
    .command('operations')
    .description('List operations for an agentic interface')
    .argument('[interfaceId]', 'Interface ID to fetch operations for')
    .option('--profile <name>', 'Profile to use')
    .option('-i, --interactive', 'Launch interactive mode')
    .option('-e, --enhanced', 'Launch enhanced explorer with advanced features')
    .action(async (interfaceId, options) => {
      if (options.enhanced) {
        await exploreInterfaces();
        return;
      } else if (options.interactive || !interfaceId) {
        await interactiveOperationsMode();
        return;
      }

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
        await displayOperations(client, interfaceId);
      } catch (error: any) {
        console.error(
          chalk.red('Failed to retrieve operations:'),
          error.message || String(error),
        );
      }
    });

  return operationsCmd;
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
