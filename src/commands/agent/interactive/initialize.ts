import { exec } from 'child_process';
import * as fssync from 'fs';
import fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XPanderConfig } from '../../../types';
import { XpanderClient } from '../../../utils/client';
import { fileExists, pathIsEmpty } from '../../../utils/custom-agents';

const execAsync = promisify(exec);

const ASSETS_REPO = 'https://github.com/xpander-ai/custom-agents-assets';

/**
 * Clone a GitHub repo and copy its contents to a destination path,
 * excluding README.md, LICENSE, and .git.
 */
const cloneRepoAndCopy = async (
  repoUrl: string,
  destPath: string,
): Promise<void> => {
  const tmpFolder = path.join(os.tmpdir(), `repo_tmp_${Date.now()}`);

  try {
    // Clone the repository shallowly (latest commit only)
    await execAsync(`git clone --depth 1 ${repoUrl} ${tmpFolder}`);

    // Ensure destination path exists
    await fs.mkdir(destPath, { recursive: true });

    const files = await fs.readdir(tmpFolder);

    for (const file of files) {
      if (['README.md', 'LICENSE', '.git'].includes(file)) continue;

      const srcPath = path.join(tmpFolder, file);
      const destFilePath = path.join(destPath, file);

      if (file === 'xpander_handler.py' && (await fileExists(destFilePath))) {
        continue;
      }
      if (
        file === 'agent_instructions.json' &&
        (await fileExists(destFilePath))
      ) {
        continue;
      }
      if (file === 'requirements.txt' && (await fileExists(destFilePath))) {
        // merge requirements
        const existingRequirements = (await fs.readFile(destFilePath))
          .toString()
          .split('\n');
        const newRequirements = (await fs.readFile(srcPath))
          .toString()
          .split('\n');
        const requirementsToAdd = [];
        for (const req of newRequirements) {
          if (!existingRequirements.includes(req)) {
            requirementsToAdd.push(req);
          }
        }

        if (requirementsToAdd.length !== 0) {
          existingRequirements.push(...requirementsToAdd);
          await fs.writeFile(destFilePath, existingRequirements.join('\n'));
        }
        continue;
      }

      const stat = await fs.lstat(srcPath);

      if (stat.isDirectory()) {
        await fs.cp(srcPath, destFilePath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(destFilePath), { recursive: true });
        await fs.copyFile(srcPath, destFilePath);
      }
    }
  } catch (error) {
    console.error('❌ Error during clone and copy:', error);
    throw error;
  } finally {
    // Cleanup temporary folder
    if (fssync.existsSync(tmpFolder)) {
      fssync.rmSync(tmpFolder, { recursive: true, force: true });
    }
  }
};

/**
 * Initialize agent with interactive prompts
 */
export async function initializeAgent(
  client: XpanderClient,
  agentToInitialize?: string,
) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Initializing agent'));
  console.log(chalk.dim('─'.repeat(60)));

  let agentId = agentToInitialize;
  if (!agentId) {
    ({ agentId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'agentId',
        message: 'Enter the agent ID you would like to initialize:',
        validate: (input) => (input.trim() ? true : 'Agent ID is required'),
      },
    ]));
  }
  agentId = agentId!;

  const initializationSpinner = ora(`Retrieving agent "${agentId}"...`).start();
  try {
    const agent = await client.getAgent(agentId);

    if (!agent) {
      initializationSpinner.fail(`Agent with ID ${agentId} failed to retrieve`);
      return;
    }

    initializationSpinner.info(`Agent ${agent?.name} retrieved successfully`);

    // Check if current folder is empty
    const currentDirectory = process.cwd();
    if (!(await pathIsEmpty(currentDirectory))) {
      const { useCurrentDir } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useCurrentDir',
          message:
            "The current directory is not empty. Proceeding will override 'requirements.txt' and add or update xpander-related files (xpander_config.json, agent_instructions.json, etc).",
          default: true,
        },
      ]);
      if (!useCurrentDir) {
        initializationSpinner.info('Initialization aborted.');
        return;
      }
    }

    initializationSpinner.text = `Initializing ${agent?.name}`;

    const hadInstructionsFile = await fileExists(
      `${currentDirectory}/agent_instructions.json`,
    );

    // Clone assets into current directory
    await cloneRepoAndCopy(ASSETS_REPO, currentDirectory);

    const config: XPanderConfig = {
      organization_id: client.orgId!,
      api_key: client.apiKey,
      agent_id: agentId,
    };

    initializationSpinner.text = `Creating configuration files`;

    // Set xpander config
    await fs.writeFile(
      path.join(currentDirectory, 'xpander_config.json'),
      JSON.stringify(config, null, 2),
    );

    if (!hadInstructionsFile) {
      // Set agent instructions
      try {
        await fs.writeFile(
          path.join(currentDirectory, 'agent_instructions.json'),
          JSON.stringify(agent.instructions, null, 2),
        );
      } catch (err) {
        // ignore
      }
    }

    initializationSpinner.succeed(`Agent initialized successfully`);
  } catch (error: any) {
    initializationSpinner.fail('Failed to initialize agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
