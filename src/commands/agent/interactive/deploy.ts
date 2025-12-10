import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';
import {
  ensureAgentIsInitialized,
  pathIsEmpty,
} from '../../../utils/custom-agents';
import {
  stopDeployment,
  uploadAndDeploy,
} from '../../../utils/custom_agents_utils/deploymentManagement';
import { buildAndSaveDockerImage } from '../../../utils/custom_agents_utils/docker';
import { getXpanderConfigFromEnvFile } from '../../../utils/custom_agents_utils/generic';
import { configureLogsCommand } from '../../logs';

export async function deployAgent(
  client: XpanderClient,
  _agentId?: string,
  skipDeploymentConfirmation: boolean = false,
  skipLocalTests: boolean = false,
  workingDirectory?: string,
) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Agent deployment'));
  console.log(chalk.dim('─'.repeat(60)));

  const isNonInteractive = process.env.XPANDER_NON_INTERACTIVE === 'true';

  const deploymentSpinner = ora(`Initializing deployment...`).start();
  try {
    // Use provided path or default to current directory
    const currentDirectory = workingDirectory || process.cwd();
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

    // Try to read config from .env file (may be missing AGENT_ID)
    let config: {
      api_key?: string;
      organization_id?: string;
      agent_id?: string;
    };
    try {
      config = await getXpanderConfigFromEnvFile(currentDirectory);
    } catch (error: any) {
      // If only AGENT_ID is missing, that's ok - we'll prompt for it
      if (error.message && error.message.includes('XPANDER_AGENT_ID')) {
        deploymentSpinner.info(
          'No agent ID found in .env file, will prompt for selection',
        );
        // Try to read just the credentials
        const fs = await import('fs/promises');
        const path = await import('path');
        const envPath = path.join(currentDirectory, '.env');
        const envContent = await fs.readFile(envPath, 'utf-8');
        const envVars = Object.fromEntries(
          envContent
            .split('\n')
            .map((line) => line.trim())
            .filter(
              (line) => line && !line.startsWith('#') && line.includes('='),
            )
            .map((line) => {
              const [key, ...rest] = line.split('=');
              const value = rest
                .join('=')
                .trim()
                .replace(/^['"]|['"]$/g, '');
              return [key.trim(), value];
            }),
        );
        config = {
          api_key: envVars.XPANDER_API_KEY,
          organization_id: envVars.XPANDER_ORGANIZATION_ID,
          agent_id: envVars.XPANDER_AGENT_ID,
        };
      } else {
        throw error;
      }
    }

    // If .env file has credentials, use them instead of profile credentials
    let deployClient = client;
    if (config.api_key && config.organization_id) {
      deploymentSpinner.info('Using credentials from .env file');
      deployClient = new XpanderClient(config.api_key, config.organization_id);
    }

    deploymentSpinner.stop();

    // Get agent ID - either from .env, command line, or prompt user
    let agentId: string | undefined = config.agent_id || _agentId;

    if (!agentId) {
      // No agent ID provided, prompt user to select or create one
      const { getAgentIdFromEnvOrSelection } = await import(
        '../../../utils/agent-resolver'
      );
      const selectedAgentId = await getAgentIdFromEnvOrSelection(
        deployClient,
        undefined,
      );
      if (!selectedAgentId) {
        return;
      }
      agentId = selectedAgentId;
    }

    if (!skipDeploymentConfirmation && !isNonInteractive) {
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
    } else if (!skipDeploymentConfirmation && isNonInteractive) {
      console.log(
        chalk.yellow(
          '→ Running in non-interactive mode, proceeding with deployment',
        ),
      );
    }

    deploymentSpinner.start('Retrieving agent information...');

    let agent = await deployClient.getAgent(agentId!);
    if (!agent) {
      // Agent doesn't exist, create it
      deploymentSpinner.info(
        `Agent ${agentId} not found, creating new agent...`,
      );

      if (!isNonInteractive) {
        const { shouldCreate } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldCreate',
            message: `Agent ${agentId} does not exist. Would you like to create it?`,
            default: true,
          },
        ]);
        if (!shouldCreate) {
          deploymentSpinner.fail('Agent creation cancelled');
          return;
        }
      }

      deploymentSpinner.start('Creating new agent...');

      try {
        // Create agent with basic configuration
        agent = await deployClient.createAgent(
          agentId, // Use agent ID as name
          'container', // Default to container deployment
        );
        deploymentSpinner.succeed(`Agent ${agent.name} created successfully`);
      } catch (createError: any) {
        deploymentSpinner.fail(
          `Failed to create agent: ${createError.message}`,
        );
        return;
      }
    }

    // Stop any existing deployment before deploying new version
    deploymentSpinner.text = `Stopping existing deployment of ${agent.name} if running...`;
    try {
      await stopDeployment(deploymentSpinner, deployClient, agent.id);
      deploymentSpinner.start(); // Restart spinner after stop operation
    } catch (error: any) {
      // If stop fails (e.g., no deployment running), continue anyway
      deploymentSpinner.info(
        `No existing deployment to stop, proceeding with deployment...`,
      );
    }

    deploymentSpinner.text = `Building agent ${agent.name}`;

    // build docker image
    const imagePath = await buildAndSaveDockerImage(
      deploymentSpinner,
      currentDirectory,
      agentId!,
      skipLocalTests,
    );

    if (!imagePath) {
      deploymentSpinner.fail(`Agent ${agentId} failed to build!`);
      return;
    }

    // upload and deploy
    const result = await uploadAndDeploy(
      deploymentSpinner,
      deployClient,
      agent.id,
      imagePath,
      currentDirectory,
    );

    if (!result) {
      deploymentSpinner.fail(`Deployment failed`);
    } else {
      deploymentSpinner.succeed(`Agent ${agent.name} deployed successfully`);
    }

    if (!isNonInteractive) {
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
        const logsCmd = tempProgram.commands.find(
          (cmd) => cmd.name() === 'logs',
        );
        if (logsCmd) {
          await logsCmd.parseAsync([]);
        }
        return;
      }
    } else {
      console.log(
        chalk.yellow(
          '→ Non-interactive mode: skipping log tail. Use "xpander logs" to view logs manually.',
        ),
      );
    }
  } catch (error: any) {
    deploymentSpinner.fail('Failed to deploy agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
