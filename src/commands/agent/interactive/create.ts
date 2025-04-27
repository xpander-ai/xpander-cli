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
    createSpinner.succeed(`Agent created successfully`);

    // Prompt for personalization
    const { personalize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'personalize',
        message: 'Would you like to personalize your agent now?',
        default: true,
      },
    ]);

    if (personalize) {
      const details = await inquirer.prompt([
        {
          type: 'input',
          name: 'icon',
          message: 'Choose an icon for your agent:',
          default: '🤖',
        },
        {
          type: 'input',
          name: 'roleInstructions',
          message: 'What role should your agent perform?',
          default: '',
        },
        {
          type: 'input',
          name: 'goalInstructions',
          message: 'What is the main goal of your agent?',
          default: '',
        },
        {
          type: 'input',
          name: 'generalInstructions',
          message: 'Any additional instructions for your agent?',
          default: '',
        },
      ]);

      const updateData: {
        icon?: string;
        instructions?: { role?: string; goal?: string; general?: string };
      } = {
        icon: details.icon,
        instructions: {},
      };

      if (details.roleInstructions)
        updateData.instructions!.role = details.roleInstructions;
      if (details.goalInstructions)
        updateData.instructions!.goal = details.goalInstructions;
      if (details.generalInstructions)
        updateData.instructions!.general = details.generalInstructions;

      // Only include instructions if at least one field is filled
      if (!Object.keys(updateData.instructions!).length) {
        delete updateData.instructions;
      }

      const updateSpinner = ora('Applying personalization...').start();
      const updatedAgent = await client.updateAgent(newAgent.id, updateData);

      if (updatedAgent) {
        updateSpinner.succeed('Personalization applied successfully');

        // Deploy the agent
        const deploySpinner = ora('Deploying agent...').start();
        await client.deployAgent(updatedAgent.id);
        deploySpinner.succeed('Agent deployed successfully');

        console.log(chalk.green('\n✅ Agent created and ready to use!'));
      } else {
        updateSpinner.fail('Failed to apply personalization');
        console.log(
          chalk.yellow('Agent was created but personalization failed.'),
        );
      }
    } else {
      // Deploy without personalization
      const deploySpinner = ora('Deploying agent...').start();
      await client.deployAgent(newAgent.id);
      deploySpinner.succeed('Agent deployed successfully');

      console.log(chalk.green('\n✅ Agent created and ready to use!'));
    }
    const { shouldInitialize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldInitialize',
        message: 'Would you like to locally initialize your agent now?',
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
