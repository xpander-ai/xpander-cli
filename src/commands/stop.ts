import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient, createClient } from '../utils/client';
import { ensureAgentIsInitialized, pathIsEmpty } from '../utils/custom-agents';
import { stopDeployment } from '../utils/custom_agents_utils/deploymentManagement';
import { getXpanderConfigFromEnvFile } from '../utils/custom_agents_utils/generic';

async function stopAgent(client: XpanderClient) {
  console.log('\n');
  console.log(chalk.bold.blue('🛑 Agent stop'));
  console.log(chalk.dim('─'.repeat(60)));

  const isNonInteractive = process.env.XPANDER_NON_INTERACTIVE === 'true';

  if (!isNonInteractive) {
    const { shouldStop } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldStop',
        message: 'Are you sure you want to stop your AI Agent deployment?',
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

  const stopSpinner = ora(`Initializing stop...`).start();
  try {
    // Check if current folder is empty
    const currentDirectory = process.cwd();
    if (await pathIsEmpty(currentDirectory)) {
      stopSpinner.fail(
        'Current workdir is not initialized, initialize your agent first.',
      );
      return;
    }

    // check for configuration and required files
    const isInitialized = await ensureAgentIsInitialized(
      currentDirectory,
      stopSpinner,
    );
    if (!isInitialized) {
      return;
    }

    const config = await getXpanderConfigFromEnvFile(currentDirectory);

    const agent = await client.getAgent(config.agent_id);
    if (!agent) {
      stopSpinner.fail(`Agent ${config.agent_id} not found!`);
      return;
    }

    stopSpinner.text = `Stopping agent ${agent.name}`;

    // stop deployment
    const result = await stopDeployment(stopSpinner, client, agent.id);

    if (!result) {
      stopSpinner.fail(`Stop failed`);
    } else {
      stopSpinner.succeed(`Agent ${agent.name} stopped successfully`);
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
    .command('stop')
    .description('Stop your AI Agent deployment')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      const client = createClient(options.profile);
      await stopAgent(client);
    });

  return stopCmd;
}
