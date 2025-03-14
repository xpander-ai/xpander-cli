import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { createClient } from '../../utils/client';
import { getApiKey } from '../../utils/config';

/**
 * Interactive interfaces management mode
 */
export async function interactiveInterfacesMode() {
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
    console.log(chalk.bold.cyan('🔌 Xpander Interfaces Management'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(
      chalk.blue(
        'Interactive mode - Browse interfaces and operations with ease',
      ),
    );
    console.log(chalk.dim('─'.repeat(60)));

    const client = createClient();

    // Main interactive loop
    let exitRequested = false;
    while (!exitRequested) {
      // Fetch interfaces
      const fetchSpinner = ora('Fetching available interfaces...').start();
      const interfaces = await client.getAgenticInterfaces();
      fetchSpinner.succeed('Interfaces loaded successfully');

      if (!interfaces || interfaces.length === 0) {
        console.log(chalk.yellow('\nNo interfaces found.'));
        exitRequested = true;
        continue;
      }

      // Display interfaces count
      console.log(chalk.cyan(`\nFound ${interfaces.length} interfaces:`));
      console.log(chalk.dim('─'.repeat(60)));

      // Offer available actions
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'List all interfaces', value: 'list' },
            { name: 'View interface details and operations', value: 'view' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      switch (action) {
        case 'list': {
          console.log('');
          interfaces.forEach((iface: any, index: number) => {
            console.log(
              `${chalk.bold(index + 1)}. ${chalk.bold(iface.name)} ${chalk.dim(`(${iface.id})`)}`,
            );
            console.log(
              chalk.dim(iface.description || 'No description available'),
            );
            console.log('');
          });
          break;
        }
        case 'view': {
          const { selectedInterface } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedInterface',
              message: 'Select an interface to view:',
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
            chalk.cyan(
              `Interface Details: ${chalk.bold(selectedInterface.name)}`,
            ),
          );
          console.log(chalk.dim('─'.repeat(60)));
          console.log(chalk.gray(`ID: ${selectedInterface.id}`));
          console.log(
            chalk.gray(
              `Description: ${selectedInterface.description || 'No description available'}`,
            ),
          );

          // Fetch operations
          const operationsSpinner = ora('Loading operations...').start();
          try {
            const operations = await client.getAgenticOperations(
              selectedInterface.id,
            );
            operationsSpinner.succeed(`Found ${operations.length} operations`);

            if (operations.length === 0) {
              console.log(
                chalk.yellow('\nNo operations available for this interface.'),
              );
            } else {
              console.log(chalk.cyan('\nOperations:'));
              console.log(chalk.dim('─'.repeat(60)));

              operations.forEach((op: any, index: number) => {
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
            console.error(chalk.red(error.message || String(error)));
          }
          break;
        }
        case 'exit':
          exitRequested = true;
          console.log(chalk.blue('\nExiting interfaces management. Goodbye!'));
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
          console.log(chalk.blue('\nExiting interfaces management. Goodbye!'));
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
