import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';

/**
 * Interactive function to attach operations to an agent
 */
export async function attachOperationsInteractive(
  client: XpanderClient,
  agentId: string,
): Promise<boolean> {
  const spinner = ora('Loading available interfaces...').start();
  try {
    // Get available interfaces
    const interfaces = await client.getAgenticInterfaces();
    spinner.stop();

    if (!interfaces || interfaces.length === 0) {
      console.log(chalk.yellow('No agentic interfaces available.'));
      return false;
    }

    // Let user select an interface
    const { selectedInterface } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedInterface',
        message: 'Select an interface:',
        choices: interfaces.map((iface: any) => ({
          name: `${iface.name} (${iface.id})`,
          value: iface.id,
          short: iface.name,
        })),
      },
    ]);

    // Load operations for the selected interface
    spinner.text = 'Loading operations...';
    spinner.start();
    const operations = await client.getAgenticOperations(selectedInterface);
    spinner.stop();

    if (!operations || operations.length === 0) {
      console.log(chalk.yellow('No operations available for this interface.'));
      return false;
    }

    // Let user select operations
    const { selectedOperations } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedOperations',
        message: 'Select operations to attach:',
        choices: operations.map((op: any) => ({
          name: `${op.name} (${op.id})`,
          value: op.id,
          short: op.name,
        })),
        validate: (answer: string[]) =>
          answer.length > 0 ? true : 'Please select at least one operation',
      },
    ]);

    // Format payload for attachment
    const toolsPayload = [
      {
        id: selectedInterface,
        operation_ids: selectedOperations,
      },
    ];

    // Attach the tools
    spinner.text = 'Attaching operations...';
    spinner.start();
    const success = await client.attachAgentTools(agentId, toolsPayload);
    spinner.stop();

    if (success) {
      console.log(
        chalk.green('Successfully attached operations to the agent.'),
      );
    } else {
      console.log(chalk.red('Failed to attach operations to the agent.'));
    }

    return success;
  } catch (error: any) {
    spinner.fail('Failed to attach operations');
    console.error(chalk.red(error.message || error));
    return false;
  }
}
