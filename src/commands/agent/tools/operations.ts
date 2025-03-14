import chalk from 'chalk';
import ora from 'ora';
import { AgenticOperation } from '../../../types/agent/operation';
import { XpanderClient } from '../../../utils/client';

export async function displayOperations(
  client: XpanderClient,
  interfaceId: string,
) {
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
