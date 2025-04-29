import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { initializeAgent } from './initialize';
import { XpanderClient } from '../../../utils/client';

/**
 * Create a new agent with interactive prompts
 */
export async function createNewAgent(client: XpanderClient) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Create New Agent'));
  console.log(chalk.dim('─'.repeat(60)));

  const { agentName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'agentName',
      message: 'Enter a name for your new agent:',
      validate: (input) => (input.trim() ? true : 'Name is required'),
    },
  ]);

  const createSpinner = ora(`Creating agent "${agentName}"...`).start();
  try {
    const newAgent = await client.createAgent(agentName);

    console.log(chalk.green('\n✅ Agent created and ready to use!'));
    createSpinner.stop();
    const { shouldInitialize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldInitialize',
        message: 'Do you want to load this agent into your current workdir?',
        default: true,
      },
    ]);
    if (shouldInitialize) {
      await initializeAgent(client, newAgent.id);
    }
  } catch (error: any) {
    createSpinner.fail('Failed to create agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
