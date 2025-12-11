import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { getAgentIdFromEnvOrSelection } from '../utils/agent-resolver';
import { XpanderClient, createClient } from '../utils/client';
import { restartDeployment } from '../utils/custom_agents_utils/deploymentManagement';

export async function restartAgent(
  client: XpanderClient,
  providedAgentId?: string,
  workingDirectory?: string,
) {
  console.log('\n');
  console.log(chalk.bold.blue('🔄 Agent restart'));
  console.log(chalk.dim('─'.repeat(60)));

  const isNonInteractive = process.env.XPANDER_NON_INTERACTIVE === 'true';

  const restartSpinner = ora(`Initializing restart...`).start();
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
      restartSpinner.fail('No agent selected.');
      return;
    }

    const agent = await client.getAgent(agentId);
    if (!agent) {
      restartSpinner.fail(`Agent ${agentId} not found!`);
      return;
    }

    restartSpinner.stop();

    if (!isNonInteractive) {
      const { shouldRestart } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldRestart',
          message: `Are you sure you want to restart ${agent.name}?`,
          default: true,
        },
      ]);

      if (!shouldRestart) {
        return;
      }
    } else {
      console.log(
        chalk.yellow(
          '→ Running in non-interactive mode, proceeding with restart',
        ),
      );
    }

    const newSpinner = ora(`Restarting agent ${agent.name}`).start();

    // restart deployment
    const result = await restartDeployment(newSpinner, client, agent.id);

    if (!result) {
      newSpinner.fail(`Restart failed`);
    } else {
      newSpinner.succeed(`Agent ${agent.name} restarted successfully`);
    }

    if (!isNonInteractive) {
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

        const logsCmd = tempProgram.commands.find(
          (cmd) => cmd.name() === 'logs',
        );
        if (logsCmd) {
          await logsCmd.parseAsync([]);
        }
      }
    } else {
      console.log(
        chalk.yellow(
          '→ Non-interactive mode: skipping log tail. Use "xpander logs" to view logs manually.',
        ),
      );
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
    .command('restart [agent]')
    .description('Restart agent deployment')
    .option('--profile <n>', 'Profile to use')
    .option(
      '--path <path>',
      'Path to agent directory (defaults to current directory)',
    )
    .action(async (agentId, options) => {
      const client = createClient(options.profile);
      await restartAgent(client, agentId, options.path);
    });

  return restartCmd;
}
