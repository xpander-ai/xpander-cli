import { exec } from 'child_process';
import * as fssync from 'fs';
import fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { AGENT_TEMPLATES } from '../../../types';
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
  let askedXpanderHandlerOverwrite = false;
  let overwriteXpanderHandler = false;
  let askedDockerfileOverwrite = false;
  let overwriteDockerfile = false;
  let askedDockerignoreOverwrite = false;
  let overwriteDockerignore = false;

  try {
    await execAsync(`git clone --depth 1 ${repoUrl} ${tmpFolder}`);
    await fs.mkdir(destPath, { recursive: true });
    const files = await fs.readdir(tmpFolder);

    for (const file of files) {
      const baseExclusions = ['README.md', 'LICENSE', '.git', 'templates'];
      const isTemplateFolder = file.endsWith('-template');
      if (baseExclusions.includes(file) || isTemplateFolder) continue;

      const srcPath = path.join(tmpFolder, file);
      const destFilePath = path.join(destPath, file);

      if (file === 'xpander_handler.py' && (await fileExists(destFilePath))) {
        if (!askedXpanderHandlerOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: "'xpander_handler.py' already exists. Overwrite?",
              default: false,
            },
          ]);
          askedXpanderHandlerOverwrite = true;
          overwriteXpanderHandler = overwrite;
        }
        if (!overwriteXpanderHandler) continue;
      }

      if (file === 'Dockerfile' && (await fileExists(destFilePath))) {
        if (!askedDockerfileOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: "'Dockerfile' already exists. Overwrite?",
              default: false,
            },
          ]);
          askedDockerfileOverwrite = true;
          overwriteDockerfile = overwrite;
        }
        if (!overwriteDockerfile) continue;
      }

      if (file === '.dockerignore' && (await fileExists(destFilePath))) {
        if (!askedDockerignoreOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message: "'.dockerignore' already exists. Overwrite?",
              default: false,
            },
          ]);
          askedDockerignoreOverwrite = true;
          overwriteDockerignore = overwrite;
        }
        if (!overwriteDockerignore) continue;
      }

      if (file === 'requirements.txt' && (await fileExists(destFilePath))) {
        const existing = (await fs.readFile(destFilePath))
          .toString()
          .split('\n');
        const incoming = (await fs.readFile(srcPath)).toString().split('\n');
        const merged = [...new Set([...existing, ...incoming])].filter(Boolean);
        await fs.writeFile(destFilePath, merged.join('\n'));
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
    if (fssync.existsSync(tmpFolder)) {
      fssync.rmSync(tmpFolder, { recursive: true, force: true });
    }
  }
};

export async function initializeAgent(
  client: XpanderClient,
  agentToInitialize?: string,
) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Initializing agent'));
  console.log(chalk.dim('─'.repeat(60)));

  let agentId = agentToInitialize;
  const fetchSpinner = ora('Fetching your agents...').start();
  const agentsList = await client.getAgents();
  if (!agentId) {
    fetchSpinner.succeed('Agents loaded successfully');

    if (!agentsList || agentsList.length === 0) {
      console.log(chalk.yellow('\nNo agents found.'));
      console.log(
        chalk.blue('Please create an agent first using "xpander agent new"'),
      );
      return;
    }

    const agents = [...agentsList].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const agentChoices = agents.map((agent) => ({
      name: `${agent.name} (${agent.id})`,
      value: agent.id,
    }));

    ({ agentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentId',
        message: 'Select an agent to initialize:',
        choices: agentChoices,
      },
    ]));
  }
  agentId = agentId!;
  const useTemplate = true;
  // disabled templates selection, agno only
  // const { useTemplate } = await inquirer.prompt([
  //   {
  //     type: 'confirm',
  //     name: 'useTemplate',
  //     message: 'Do you want to use a template for initialization?',
  //     default: false,
  //   },
  // ]);

  if (useTemplate) {
    // disabled templates selection, agno only
    // const { selectTemplate } = await import('../../../utils/template-selector');
    const { initializeAgentWithTemplate } = await import(
      '../../../utils/template-cloner'
    );

    try {
      // disabled templates selection, agno only
      // const selectedTemplate = await selectTemplate();
      const agentDetails = agentsList.find((ag) => ag.id === agentId);
      const selectedTemplate =
        AGENT_TEMPLATES.find((tmp) => tmp.id === agentDetails?.framework)! ||
        AGENT_TEMPLATES.find((tmp) => tmp.id === 'agno')!;

      const { displayTemplateInfo } = await import(
        '../../../utils/template-selector'
      );
      displayTemplateInfo(selectedTemplate);
      await initializeAgentWithTemplate(client, agentId, selectedTemplate);
      return;
    } catch (error: any) {
      console.error('Template initialization failed:', error.message);
      return;
    }
  }

  const initializationSpinner = ora(`Retrieving agent "${agentId}"...`).start();
  try {
    const agent = await client.getAgent(agentId);
    if (!agent) {
      initializationSpinner.fail(`Agent with ID ${agentId} failed to retrieve`);
      return;
    }

    initializationSpinner.info(`Agent ${agent?.name} retrieved successfully`);

    let currentDirectory = process.cwd();
    if (!(await pathIsEmpty(currentDirectory))) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message:
            'The current directory is not empty. What would you like to do?',
          choices: [
            {
              name: 'Continue in current directory (you will be prompted before overwriting files)',
              value: 'continue',
            },
            {
              name: `Create a new subfolder "${agent?.name || 'agent'}"`,
              value: 'subfolder',
            },
            { name: 'Cancel initialization', value: 'cancel' },
          ],
          default: 'subfolder',
        },
      ]);

      if (action === 'cancel') {
        initializationSpinner.info('Initialization aborted.');
        return;
      }

      if (action === 'subfolder') {
        const folderName = agent?.name || 'agent';
        const newDirectory = path.join(currentDirectory, folderName);
        await fs.mkdir(newDirectory, { recursive: true });
        currentDirectory = newDirectory;
        console.log(chalk.green(`✓ Created subfolder: ${folderName}`));
      }
    }

    initializationSpinner.text = `Initializing ${agent?.name}`;

    await cloneRepoAndCopy(ASSETS_REPO, currentDirectory);

    const envPath = path.join(currentDirectory, '.env');
    const envExamplePath = path.join(currentDirectory, '.env.example');

    const envVars: any = {
      XPANDER_API_KEY: client.apiKey,
      XPANDER_ORGANIZATION_ID: client.orgId!,
      XPANDER_AGENT_ID: agentId,
    };

    const existingEnv = (await fileExists(envPath))
      ? (await fs.readFile(envPath, 'utf-8')).split('\n')
      : [];

    const exampleEnv = (await fileExists(envExamplePath))
      ? (await fs.readFile(envExamplePath, 'utf-8')).split('\n')
      : [];

    const keysToInsert = Object.keys(envVars);

    // Start with existing .env content if it exists, otherwise use example
    const baseEnv = existingEnv.length > 0 ? existingEnv : exampleEnv;
    const mergedLines: string[] = baseEnv.map((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return line;

      const [key] = line.split('=', 1);
      if (keysToInsert.includes(key.trim())) {
        // Only update if the key doesn't already have a value (not empty or placeholder)
        const existingValue = line.split('=').slice(1).join('=');
        if (
          !existingValue ||
          existingValue.trim() === '' ||
          existingValue.includes('your-') ||
          existingValue.includes('placeholder') ||
          existingValue.includes('{') ||
          existingValue.includes('}')
        ) {
          return `${key}=${envVars[key.trim()]}`;
        }
        return line; // Keep existing value
      }
      return line;
    });

    // Add any missing required keys
    for (const key of keysToInsert) {
      if (!mergedLines.some((line) => line.trim().startsWith(`${key}=`))) {
        mergedLines.push(`${key}=${envVars[key]}`);
      }
    }

    await fs.writeFile(envPath, mergedLines.join('\n'));

    initializationSpinner.succeed(`Agent initialized successfully`);
  } catch (error: any) {
    initializationSpinner.fail('Failed to initialize agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
