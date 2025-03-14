import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { AgenticOperation } from '../../types/agent/operation';
import { createClient } from '../../utils/client';
import { getApiKey } from '../../utils/config';

/**
 * Interactive operations management mode
 */
export async function interactiveOperationsMode() {
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
    console.log(chalk.bold.cyan('🛠️  Xpander Operations Management'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(
      chalk.blue('Interactive mode - Browse operations for interfaces'),
    );
    console.log(chalk.dim('─'.repeat(60)));

    const client = createClient();

    // Main interactive loop
    let exitRequested = false;
    while (!exitRequested) {
      // First, load interfaces
      const interfacesSpinner = ora('Loading available interfaces...').start();
      const interfaces = await client.getAgenticInterfaces();
      interfacesSpinner.succeed(`Found ${interfaces.length} interfaces`);

      if (!interfaces || interfaces.length === 0) {
        console.log(chalk.yellow('\nNo interfaces found.'));
        exitRequested = true;
        continue;
      }

      // Let user select an interface
      const { selectedInterface } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedInterface',
          message: 'Select an interface to view operations:',
          choices: interfaces.map((iface: any, index: number) => ({
            name: `${index + 1}. ${iface.name}`,
            value: iface,
            short: iface.name,
          })),
          pageSize: 15,
        },
      ]);

      console.log('');
      console.log(
        chalk.cyan(`Selected Interface: ${chalk.bold(selectedInterface.name)}`),
      );
      console.log(chalk.gray(`ID: ${selectedInterface.id}`));
      console.log('');

      // Load operations for selected interface
      const operationsSpinner = ora('Loading operations...').start();

      try {
        const operations = await client.getAgenticOperations(
          selectedInterface.id,
        );

        if (operations.length === 0) {
          operationsSpinner.warn('No operations found for this interface');
          console.log(
            chalk.yellow(
              'This interface has no operations defined or they are not accessible.\n' +
                'This could be because:\n' +
                '1. The interface has no operations defined\n' +
                '2. The operations API is temporarily unavailable\n' +
                '3. You do not have permissions to view these operations\n',
            ),
          );
        } else {
          operationsSpinner.succeed(`Found ${operations.length} operations`);

          console.log(chalk.cyan('\nOperations:'));
          console.log(chalk.dim('─'.repeat(60)));

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
      } catch (error: any) {
        operationsSpinner.fail('Failed to load operations');
        console.error(chalk.red('Error: ' + (error.message || String(error))));
      }

      // Ask user if they want to continue
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            {
              name: 'View operations for another interface',
              value: 'continue',
            },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      if (action === 'exit') {
        exitRequested = true;
        console.log(chalk.blue('\nExiting operations management. Goodbye!'));
      }
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error in interactive mode:'),
      error.message || String(error),
    );
  }
}
