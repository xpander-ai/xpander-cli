import fs from 'fs/promises';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XPanderConfig } from '../../../types';
import { XpanderClient } from '../../../utils/client';
import { fileExists, pathIsEmpty } from '../../../utils/custom-agents';
import { buildAndSaveDockerImage } from '../../../utils/custom_agents_utils/docker';
import { uploadAndDeploy } from '../../../utils/custom_agents_utils/upload';

const requiredFiles = [
  'requirements.txt',
  'Dockerfile',
  'xpander_config.json',
  'xpander_handler.py',
];

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
    const missingFiles: string[] = [];
    for (const file of requiredFiles) {
      if (!(await fileExists(`${currentDirectory}/${file}`))) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length !== 0) {
      deploymentSpinner.fail(
        'Current workdir structure is invalid, re-initialize your agent.',
      );
      return;
    }

    const config: XPanderConfig = JSON.parse(
      (await fs.readFile(`${currentDirectory}/xpander_config.json`)).toString(),
    );

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
  } catch (error: any) {
    deploymentSpinner.fail('Failed to deploy agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
