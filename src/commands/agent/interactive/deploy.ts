import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';
import {
  ensureAgentIsInitialized,
  pathIsEmpty,
} from '../../../utils/custom-agents';
import { uploadAndDeploy } from '../../../utils/custom_agents_utils/deploymentManagement';
import { buildAndSaveDockerImage } from '../../../utils/custom_agents_utils/docker';
import { getXpanderConfigFromEnvFile } from '../../../utils/custom_agents_utils/generic';
import { configureLogsCommand } from '../../logs';

export async function deployAgent(
  client: XpanderClient,
  skipDeploymentConfirmation: boolean = false,
) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Agent deployment'));
  console.log(chalk.dim('─'.repeat(60)));

  if (!skipDeploymentConfirmation) {
    const { shouldDeploy } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldDeploy',
        message: 'Are you sure you want to deploy your AI Agent?',
        default: true,
      },
    ]);
    if (!shouldDeploy) {
      return;
    }
  }

  const deploymentSpinner = ora(`Initializing deployment...`).start();
  try {
    // Check if current folder is empty
    const currentDirectory = process.cwd();
    if (await pathIsEmpty(currentDirectory)) {
      deploymentSpinner.fail(
        'Current workdir is no initialized, initialize your agent first.',
      );
      return;
    }

    // check for configuration and required files
    const isInitialized = await ensureAgentIsInitialized(
      currentDirectory,
      deploymentSpinner,
    );
    if (!isInitialized) {
      return;
    }

    const config = await getXpanderConfigFromEnvFile(currentDirectory);

    const agent = await client.getAgent(config.agent_id);
    if (!agent) {
      deploymentSpinner.fail(`Agent ${config.agent_id} not found!`);
      return;
    }

    deploymentSpinner.text = `Building agent ${agent.name}`;

    // build docker image
    const imagePath = await buildAndSaveDockerImage(
      deploymentSpinner,
      currentDirectory,
      config.agent_id,
    );

    if (!imagePath) {
      deploymentSpinner.fail(`Agent ${config.agent_id} failed to build!`);
      return;
    }

    // upload and deploy
    const result = await uploadAndDeploy(
      deploymentSpinner,
      client,
      agent.id,
      imagePath,
    );

    if (!result) {
      deploymentSpinner.fail(`Deployment failed`);
    } else {
      deploymentSpinner.succeed(`Agent ${agent.name} deployed successfully`);
    }

    const { tailLogs } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'tailLogs',
        message: 'Tail logs from the running AI Agent?',
        default: true,
      },
    ]);
    if (tailLogs) {
      // Create a temporary program just to run the logs command
      const tempProgram = new Command();
      configureLogsCommand(tempProgram);

      // Find the logs command and execute it without passing any arguments
      const logsCmd = tempProgram.commands.find((cmd) => cmd.name() === 'logs');
      if (logsCmd) {
        await logsCmd.parseAsync([]);
      }
      return;
    }
  } catch (error: any) {
    deploymentSpinner.fail('Failed to deploy agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
