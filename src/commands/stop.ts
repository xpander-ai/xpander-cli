import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getAgentIdFromEnvOrSelection } from '../utils/agent-resolver';
import { XpanderClient, createClient } from '../utils/client';
import { stopDeployment } from '../utils/custom_agents_utils/deploymentManagement';

export async function stopAgent(
  client: XpanderClient,
  providedAgentId?: string,
  workingDirectory?: string,
) {
  console.log('\n');
  console.log(chalk.bold.blue('🛑 Agent stop'));
  console.log(chalk.dim('─'.repeat(60)));

  const isNonInteractive = process.env.XPANDER_NON_INTERACTIVE === 'true';

  const stopSpinner = ora(`Initializing stop...`).start();
  try {
    // Change to working directory if provided
    const originalCwd = process.cwd();
    if (workingDirectory) {
      process.chdir(workingDirectory);
    }

    const agentId = await getAgentIdFromEnvOrSelection(client, providedAgentId);

    // Restore original working directory
    if (workingDirectory) {
      process.chdir(originalCwd);
    }
    if (!agentId) {
      stopSpinner.fail('No agent selected.');
      return;
    }

    const agent = await client.getAgent(agentId);
    if (!agent) {
      stopSpinner.fail(`Agent ${agentId} not found!`);
      return;
    }

    stopSpinner.stop();

    if (!isNonInteractive) {
      const { shouldStop } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldStop',
          message: `Are you sure you want to stop ${agent.name}?`,
          default: true,
        },
      ]);

      if (!shouldStop) {
        return;
      }
    } else {
      console.log(
        chalk.yellow('→ Running in non-interactive mode, proceeding with stop'),
      );
    }

    const newSpinner = ora(`Stopping agent ${agent.name}`).start();

    // stop deployment
    const result = await stopDeployment(newSpinner, client, agent.id);

    if (!result) {
      newSpinner.fail(`Stop failed`);
    } else {
      newSpinner.succeed(`Agent ${agent.name} stopped successfully`);
    }
  } catch (error: any) {
    stopSpinner.fail('Failed to stop agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Register stop command
 */
export function configureStopCommand(program: Command): Command {
  const stopCmd = program
    .command('stop [agent]')
    .description('Stop agent deployment')
    .option('--profile <n>', 'Profile to use')
    .option(
      '--path <path>',
      'Path to agent directory (defaults to current directory)',
    )
    .action(async (agentId, options) => {
      const client = createClient(options.profile);
      await stopAgent(client, agentId, options.path);
    });

  return stopCmd;
}
