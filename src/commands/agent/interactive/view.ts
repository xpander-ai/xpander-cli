import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';
import { colorizeStatus } from '../helpers/format';

/**
 * View details of a selected agent
 */
export async function viewAgentDetails(client: XpanderClient, agents: any[]) {
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: 'Select an agent to view:',
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

    // Display agent details
    console.log('\n');
    console.log(chalk.bold.cyan('🤖 Agent Details'));
    console.log(chalk.dim('─'.repeat(60)));

    console.log(`${chalk.bold('Name:')}      ${agentDetails.name}`);
    console.log(`${chalk.bold('ID:')}        ${chalk.dim(agentDetails.id)}`);
    console.log(
      `${chalk.bold('Status:')}    ${colorizeStatus(agentDetails.status)}`,
    );
    console.log(
      `${chalk.bold('Type:')}      ${agentDetails.type || 'regular'}`,
    );
    console.log(
      `${chalk.bold('Model:')}     ${agentDetails.model_name || 'gpt-4o'}`,
    );
    console.log(`${chalk.bold('Version:')}   ${agentDetails.version || 1}`);
    console.log(
      `${chalk.bold('Tools:')}     ${agentDetails.tools?.length || 0}`,
    );

    if ('icon' in agentDetails && agentDetails.icon) {
      console.log(`${chalk.bold('Icon:')}      ${agentDetails.icon}`);
    }

    // Format date nicely
    const created = new Date(agentDetails.created_at);
    console.log(`${chalk.bold('Created:')}   ${created.toLocaleDateString()}`);

    // Display instructions if available
    if (agentDetails.instructions) {
      console.log('\n' + chalk.bold('Instructions:'));
      if (agentDetails.instructions.role)
        console.log(
          `${chalk.bold('• Role:')}     ${agentDetails.instructions.role}`,
        );
      if (agentDetails.instructions.goal)
        console.log(
          `${chalk.bold('• Goal:')}     ${agentDetails.instructions.goal}`,
        );
      if (agentDetails.instructions.general)
        console.log(
          `${chalk.bold('• General:')}  ${agentDetails.instructions.general}`,
        );
    }

    console.log(chalk.dim('─'.repeat(60)));

    // Offer additional actions for this agent
    const { nextAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do with this agent?',
        choices: [
          { name: 'Update this agent', value: 'update' },
          { name: 'Delete this agent', value: 'delete' },
          { name: 'Return to main menu', value: 'main' },
        ],
      },
    ]);

    if (nextAction === 'update') {
      // Import dynamically to avoid circular dependencies
      const { updateSpecificAgent } = await import('./update');
      await updateSpecificAgent(client, agentDetails);
    } else if (nextAction === 'delete') {
      // Import dynamically to avoid circular dependencies
      const { deleteSpecificAgent } = await import('./delete');
      await deleteSpecificAgent(client, agentDetails);
    }
    // Return to main menu happens automatically
  } catch (error: any) {
    spinner.fail('Failed to fetch agent details');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
