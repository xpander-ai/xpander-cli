import { exec } from 'child_process';
import * as fssync from 'fs';
import fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XPanderConfig } from '../types';
import { XpanderClient } from './client';
import { fileExists, pathIsEmpty } from './custom-agents';
import { AgentTemplate } from '../types/templates';

const execAsync = promisify(exec);

/**
 * Clone a specific template from the repository
 */
export async function cloneTemplate(
  template: AgentTemplate,
  destPath: string,
  client: XpanderClient,
  agentId: string,
): Promise<void> {
  const tmpFolder = path.join(os.tmpdir(), `template_tmp_${Date.now()}`);
  let askedXpanderHandlerOverwrite = false;
  let overwriteXpanderHandler = false;
  let askedAgentInstructionsOverwrite = false;
  let overwriteAgentInstructions = false;
  let askedDockerfileOverwrite = false;
  let overwriteDockerfile = false;
  let askedDockerignoreOverwrite = false;
  let overwriteDockerignore = false;

  try {
    // Clone the repository shallowly (latest commit only)
    await execAsync(
      `git clone --depth 1 ${template.repositoryUrl} ${tmpFolder}`,
    );

    // Determine source path based on template
    const srcPath = template.folderName
      ? path.join(tmpFolder, template.folderName)
      : tmpFolder;

    // Check if template folder exists (for non-base templates)
    if (template.folderName && !(await fileExists(srcPath))) {
      throw new Error(
        `Template folder "${template.folderName}" not found in repository. This template may not be ready yet.`,
      );
    }

    // Ensure destination path exists
    await fs.mkdir(destPath, { recursive: true });

    const files = await fs.readdir(srcPath);

    for (const file of files) {
      if (
        ['README.md', 'LICENSE', '.git', 'xpander_config.json'].includes(file)
      )
        continue;

      const fileSrcPath = path.join(srcPath, file);
      const destFilePath = path.join(destPath, file);

      if (file === 'xpander_handler.py' && (await fileExists(destFilePath))) {
        if (!askedXpanderHandlerOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message:
                "'xpander_handler.py' already exists. Do you want to overwrite it?",
              default: false,
            },
          ]);
          askedXpanderHandlerOverwrite = true;
          overwriteXpanderHandler = overwrite;
        }
        if (!overwriteXpanderHandler) {
          continue;
        }
      }

      if (
        file === 'agent_instructions.json' &&
        (await fileExists(destFilePath))
      ) {
        if (!askedAgentInstructionsOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message:
                "'agent_instructions.json' already exists. Do you want to overwrite it?",
              default: false,
            },
          ]);
          askedAgentInstructionsOverwrite = true;
          overwriteAgentInstructions = overwrite;
        }
        if (!overwriteAgentInstructions) {
          continue;
        }
      }

      if (file === 'Dockerfile' && (await fileExists(destFilePath))) {
        if (!askedDockerfileOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message:
                "'Dockerfile' already exists. Do you want to overwrite it?",
              default: false,
            },
          ]);
          askedDockerfileOverwrite = true;
          overwriteDockerfile = overwrite;
        }
        if (!overwriteDockerfile) {
          continue;
        }
      }

      if (file === '.dockerignore' && (await fileExists(destFilePath))) {
        if (!askedDockerignoreOverwrite) {
          const { overwrite } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'overwrite',
              message:
                "'.dockerignore' already exists. Do you want to overwrite it?",
              default: false,
            },
          ]);
          askedDockerignoreOverwrite = true;
          overwriteDockerignore = overwrite;
        }
        if (!overwriteDockerignore) {
          continue;
        }
      }

      if (file === 'requirements.txt' && (await fileExists(destFilePath))) {
        // merge requirements
        const existingRequirements = (await fs.readFile(destFilePath))
          .toString()
          .split('\n');
        const newRequirements = (await fs.readFile(fileSrcPath))
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

      const stat = await fs.lstat(fileSrcPath);

      if (stat.isDirectory()) {
        await fs.cp(fileSrcPath, destFilePath, { recursive: true });
      } else {
        await fs.mkdir(path.dirname(destFilePath), { recursive: true });
        await fs.copyFile(fileSrcPath, destFilePath);
      }
    }

    // Create xpander_config.json with the agent configuration
    const config: XPanderConfig = {
      organization_id: client.orgId!,
      api_key: client.apiKey,
      agent_id: agentId,
    };

    const xpanderConfigPath = path.join(destPath, 'xpander_config.json');
    let shouldWriteXpanderConfig = true;

    if (await fileExists(xpanderConfigPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message:
            "'xpander_config.json' already exists. Do you want to overwrite it?",
          default: false,
        },
      ]);
      shouldWriteXpanderConfig = overwrite;
    }

    if (shouldWriteXpanderConfig) {
      await fs.writeFile(xpanderConfigPath, JSON.stringify(config, null, 2));
    }
  } catch (error) {
    console.error('❌ Error during template clone:', error);
    throw error;
  } finally {
    // Cleanup temporary folder
    if (fssync.existsSync(tmpFolder)) {
      fssync.rmSync(tmpFolder, { recursive: true, force: true });
    }
  }
}

/**
 * Initialize agent with template selection
 */
export async function initializeAgentWithTemplate(
  client: XpanderClient,
  agentId: string,
  template: AgentTemplate,
): Promise<void> {
  console.log('\n');
  console.log(chalk.bold.blue('🚀 Initializing Agent with Template'));
  console.log(chalk.dim('─'.repeat(60)));

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
            'The current directory is not empty. You will be prompted before overwriting any existing files. Continue?',
          default: true,
        },
      ]);
      if (!useCurrentDir) {
        initializationSpinner.info('Initialization aborted.');
        return;
      }
    }

    initializationSpinner.text = `Initializing ${agent?.name} with ${template.name} template`;

    // Clone template into current directory
    await cloneTemplate(template, currentDirectory, client, agentId);

    // Set agent instructions only if file doesn't exist (handled in cloneTemplate for existing files)
    const agentInstructionsPath = path.join(
      currentDirectory,
      'agent_instructions.json',
    );
    if (!(await fileExists(agentInstructionsPath))) {
      try {
        await fs.writeFile(
          agentInstructionsPath,
          JSON.stringify(agent.instructions, null, 2),
        );
      } catch (err) {
        // ignore
      }
    }

    initializationSpinner.succeed(
      `Agent initialized successfully with ${template.name} template`,
    );

    console.log('\n');
    console.log(chalk.green.bold('✅ Template Integration Complete!'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(chalk.bold('Agent:    ') + chalk.cyan(agent.name));
    console.log(chalk.bold('Template: ') + chalk.yellow(template.name));
    console.log(chalk.bold('Category: ') + chalk.magenta(template.category));
    console.log(chalk.dim('─'.repeat(50)));
  } catch (error: any) {
    initializationSpinner.fail('Failed to initialize agent with template');
    console.error(chalk.red('Error:'), error.message || String(error));
    throw error;
  }
}
