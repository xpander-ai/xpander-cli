import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';
import {
  ensureAgentIsInitialized,
  fileExists,
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
  useProfileCredentials: boolean = false,
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

    // Check if .env file exists, if not create it with CLI credentials
    const fs = await import('fs/promises');
    const path = await import('path');
    const envPath = path.join(currentDirectory, '.env');
    const envExists = await fileExists(envPath);

    if (!envExists) {
      deploymentSpinner.info(
        '.env file not found, creating it with CLI credentials',
      );

      // Get credentials from client (which uses profile or default)
      const credentials = {
        api_key: client.apiKey,
        organization_id: client.orgId,
      };

      // Create .env file with CLI credentials
      const envContent = `XPANDER_API_KEY=${credentials.api_key}
XPANDER_ORGANIZATION_ID=${credentials.organization_id}
XPANDER_AGENT_ID=
`;
      await fs.writeFile(envPath, envContent);
      deploymentSpinner.info('Created .env file with CLI credentials');
      deploymentSpinner.start();
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
    // BUT only if --profile was NOT explicitly specified
    let deployClient = client;
    if (!useProfileCredentials && config.api_key && config.organization_id) {
      deploymentSpinner.info('Using credentials from .env file');
      deployClient = new XpanderClient(config.api_key, config.organization_id);
    } else if (useProfileCredentials) {
      deploymentSpinner.info(
        'Using credentials from profile (--profile flag set)',
      );
    }

    deploymentSpinner.stop();

    // Get agent ID - command line takes precedence over .env file
    // Need to resolve agent name to ID if a name was provided
    let agentId: string | undefined;

    if (_agentId) {
      // Command-line argument provided - resolve name to ID
      const { resolveAgentId } = await import('../../../utils/agent-resolver');
      const resolved = await resolveAgentId(deployClient, _agentId, true);
      agentId = resolved || undefined;
    } else if (config.agent_id) {
      // Use agent ID from .env file
      agentId = config.agent_id;
    } else {
      // No agent ID provided
      // In non-interactive mode, we'll use the directory name and let the agent creation logic handle it
      // In interactive mode, prompt user to select
      if (isNonInteractive) {
        // Use directory name as agent name/id - will be created if doesn't exist
        agentId = path.basename(currentDirectory);
        deploymentSpinner.info(
          `No agent ID found, will create/use agent: ${agentId}`,
        );
      } else {
        // Prompt user to select or create one
        const { getAgentIdFromEnvOrSelection } = await import(
          '../../../utils/agent-resolver'
        );
        const selectedAgentId = await getAgentIdFromEnvOrSelection(
          deployClient,
          undefined,
          false,
          currentDirectory,
        );
        if (!selectedAgentId) {
          return;
        }
        agentId = selectedAgentId;
      }
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

      if (!skipDeploymentConfirmation && !isNonInteractive) {
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
      } else if (skipDeploymentConfirmation || isNonInteractive) {
        console.log(
          chalk.yellow('→ Agent does not exist, creating automatically...'),
        );
      }

      deploymentSpinner.start('Creating new agent...');

      try {
        // Use the directory name as the agent name
        const agentName = path.basename(currentDirectory);

        // Create agent with basic configuration
        agent = await deployClient.createAgent(
          agentName, // Use directory name as agent name
          'container', // Default to container deployment
        );
        deploymentSpinner.succeed(`Agent ${agent.name} created successfully`);

        // Update agentId to use the newly created agent's ID
        agentId = agent.id;

        // Update .env file with the new agent ID
        if (agent) {
          const envContent = await fs.readFile(envPath, 'utf-8');
          const updatedEnvContent = envContent
            .split('\n')
            .map((line) => {
              if (line.trim().startsWith('XPANDER_AGENT_ID=')) {
                return `XPANDER_AGENT_ID=${agent!.id}`;
              }
              return line;
            })
            .join('\n');
          await fs.writeFile(envPath, updatedEnvContent);
          deploymentSpinner.info(
            `Updated .env file with new agent ID: ${agent.id}`,
          );
        }
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
      deploymentSpinner.start(); // Restart spinner after info message
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
