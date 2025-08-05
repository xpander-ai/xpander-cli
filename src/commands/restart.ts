import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient, createClient } from '../utils/client';
import { ensureAgentIsInitialized, pathIsEmpty } from '../utils/custom-agents';
import { restartDeployment } from '../utils/custom_agents_utils/deploymentManagement';
import { getXpanderConfigFromEnvFile } from '../utils/custom_agents_utils/generic';

async function restartAgent(client: XpanderClient) {
  console.log('\n');
  console.log(chalk.bold.blue('🔄 Agent restart'));
  console.log(chalk.dim('─'.repeat(60)));

  const { shouldRestart } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldRestart',
      message: 'Are you sure you want to restart your AI Agent deployment?',
      default: true,
    },
  ]);

  if (!shouldRestart) {
    return;
  }

  const restartSpinner = ora(`Initializing restart...`).start();
  try {
    // Check if current folder is empty
    const currentDirectory = process.cwd();
    if (await pathIsEmpty(currentDirectory)) {
      restartSpinner.fail(
        'Current workdir is not initialized, initialize your agent first.',
      );
      return;
    }

    // check for configuration and required files
    const isInitialized = await ensureAgentIsInitialized(
      currentDirectory,
      restartSpinner,
    );
    if (!isInitialized) {
      return;
    }

    const config = await getXpanderConfigFromEnvFile(currentDirectory);

    const agent = await client.getAgent(config.agent_id);
    if (!agent) {
      restartSpinner.fail(`Agent ${config.agent_id} not found!`);
      return;
    }

    restartSpinner.text = `Restarting agent ${agent.name}`;

    // restart deployment
    const result = await restartDeployment(restartSpinner, client, agent.id);

    if (!result) {
      restartSpinner.fail(`Restart failed`);
    } else {
      restartSpinner.succeed(`Agent ${agent.name} restarted successfully`);
    }

    const { tailLogs } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'tailLogs',
        message: 'Tail logs from the restarted AI Agent?',
        default: true,
      },
    ]);

    if (tailLogs) {
      // Import and execute logs command
      const { configureLogsCommand } = await import('./logs');
      const tempProgram = new Command();
      configureLogsCommand(tempProgram);

      const logsCmd = tempProgram.commands.find((cmd) => cmd.name() === 'logs');
      if (logsCmd) {
        await logsCmd.parseAsync([]);
      }
    }
  } catch (error: any) {
    restartSpinner.fail('Failed to restart agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Register restart command
 */
export function configureRestartCommand(program: Command): Command {
  const restartCmd = program
    .command('restart')
    .description('Restart your AI Agent deployment')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      const client = createClient(options.profile);
      await restartAgent(client);
    });

  return restartCmd;
}
