import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';

/**
 * Update a specific agent
 */
export async function updateSpecificAgent(
  client: XpanderClient,
  agentItem: any,
) {
  console.log('\n');
  console.log(chalk.bold.blue('✏️ Update Agent'));
  console.log(chalk.dim('─'.repeat(60)));

  const details = await inquirer.prompt([
    {
      type: 'input',
      name: 'icon',
      message: 'Choose an icon for your agent:',
      default: agentItem.icon || '🤖',
    },
    {
      type: 'input',
      name: 'roleInstructions',
      message: 'What role should your agent perform?',
      default: agentItem.instructions?.role || '',
    },
    {
      type: 'input',
      name: 'goalInstructions',
      message: 'What is the main goal of your agent?',
      default: agentItem.instructions?.goal || '',
    },
    {
      type: 'input',
      name: 'generalInstructions',
      message: 'Any additional instructions for your agent?',
      default: agentItem.instructions?.general || '',
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

  const updateSpinner = ora('Updating agent...').start();
  try {
    const updatedAgent = await client.updateAgent(agentItem.id, updateData);

    if (updatedAgent) {
      updateSpinner.succeed('Agent updated successfully');

      // Ask about deployment
      const { deploy } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'deploy',
          message: 'Would you like to deploy the updated agent?',
          default: true,
        },
      ]);

      if (deploy) {
        const deploySpinner = ora('Deploying updated agent...').start();
        await client.deployAgent(updatedAgent.id);
        deploySpinner.succeed('Agent deployed successfully');
      }

      console.log(chalk.green('\n✅ Agent updated successfully!'));
    } else {
      updateSpinner.fail('Failed to update agent');
    }
  } catch (error: any) {
    updateSpinner.fail('Failed to update agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Update an existing agent (with selection)
 */
export async function updateExistingAgent(
  client: XpanderClient,
  agents: any[],
) {
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: 'Select an agent to update:',
      choices: agents.map((agentEntry) => ({
        name: `${agentEntry.name} ${chalk.dim(`(${agentEntry.id})`)}`,
        value: agentEntry.id,
      })),
      pageSize: 15,
    },
  ]);

  const spinner = ora('Fetching agent details...').start();
  try {
    const agentDetails = await client.getAgent(agentId);
    spinner.succeed('Details loaded');

    if (!agentDetails) {
      console.log(chalk.yellow('\nAgent not found or access denied.'));
      return;
    }

    await updateSpecificAgent(client, agentDetails);
  } catch (error: any) {
    spinner.fail('Failed to fetch agent details');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
