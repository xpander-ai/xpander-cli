import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';

/**
 * Delete a specific agent
 */
export async function deleteSpecificAgent(
  client: XpanderClient,
  agentItem: any,
) {
  console.log('\n');
  console.log(chalk.bold.red('🗑️ Delete Agent'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    chalk.yellow(`You're about to delete: ${chalk.cyan(agentItem.name)}`),
  );
  console.log(chalk.dim(`ID: ${agentItem.id}`));
  console.log(chalk.red('\n⚠️ This action cannot be undone!'));
  console.log(chalk.dim('─'.repeat(60)));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to delete this agent?',
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.blue('Deletion cancelled.'));
    return;
  }

  const deleteSpinner = ora(`Deleting agent "${agentItem.name}"...`).start();
  try {
    const success = await client.deleteAgent(agentItem.id);

    if (success) {
      deleteSpinner.succeed('Agent deleted successfully');
      console.log(chalk.green('\n✅ Agent has been permanently deleted.'));
    } else {
      deleteSpinner.fail('Failed to delete agent');
    }
  } catch (error: any) {
    deleteSpinner.fail('Failed to delete agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Delete multiple agents with multi-select
 */
export async function deleteAgents(client: XpanderClient, agents: any[]) {
  console.log('\n');
  console.log(chalk.bold.red('🗑️ Delete Multiple Agents'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.yellow('Select agents to delete:'));
  console.log(
    chalk.dim(
      '(Use space to select, arrow keys to navigate, enter to confirm)',
    ),
  );

  const { selectedAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAgents',
      message: 'Choose agents to delete:',
      choices: agents.map((agentItem) => ({
        name: `${agentItem.name} ${chalk.dim(`(${agentItem.id})`)}`,
        value: { id: agentItem.id, name: agentItem.name },
      })),
      pageSize: 15,
      validate: (selected) => {
        if (selected.length === 0)
          return 'Please select at least one agent or press Ctrl+C to cancel';
        return true;
      },
    },
  ]);

  if (selectedAgents.length === 0) {
    console.log(chalk.blue('No agents selected. Operation cancelled.'));
    return;
  }

  console.log('\n');
  console.log(chalk.bold.red('⚠️ Confirm Deletion'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    chalk.yellow(`You're about to delete ${selectedAgents.length} agent(s):`),
  );

  selectedAgents.forEach((agentSelected: any, index: number) => {
    console.log(
      `${index + 1}. ${chalk.cyan(agentSelected.name)} ${chalk.dim(`(${agentSelected.id})`)}`,
    );
  });

  console.log(chalk.red('\n⚠️ This action cannot be undone!'));
  console.log(chalk.dim('─'.repeat(60)));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete these ${selectedAgents.length} agent(s)?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.blue('\nDeletion cancelled.'));
    return;
  }

  console.log('\n');
  console.log(chalk.bold('Deleting agents:'));
  console.log(chalk.dim('─'.repeat(60)));

  let successCount = 0;
  let failCount = 0;

  for (const agentSelected of selectedAgents) {
    const deleteSpinner = ora(`Deleting "${agentSelected.name}"...`).start();
    try {
      const success = await client.deleteAgent(agentSelected.id);

      if (success) {
        deleteSpinner.succeed(`Deleted: ${agentSelected.name}`);
        successCount++;
      } else {
        deleteSpinner.fail(`Failed to delete: ${agentSelected.name}`);
        failCount++;
      }
    } catch (error: any) {
      deleteSpinner.fail(`Failed to delete: ${agentSelected.name}`);
      console.error(chalk.red('  Error:'), error.message || String(error));
      failCount++;
    }
  }

  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    `${chalk.green(`✅ Successfully deleted: ${successCount}`)}${failCount > 0 ? chalk.red(` | Failed: ${failCount}`) : ''}`,
  );
}
