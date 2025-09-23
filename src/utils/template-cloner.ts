import { exec } from 'child_process';
import * as fssync from 'fs';
import fs from 'fs/promises';
import * as os from 'os';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient } from './client';
import { fileExists, pathIsEmpty } from './custom-agents';
import { createNeMoConfigFile } from './nemo';
import { AGENT_TEMPLATES, AgentTemplate } from '../types/templates';

const execAsync = promisify(exec);

/**
 * Converts SSH git URL to HTTPS URL
 * @param sshUrl - SSH URL like git@github.com:user/repo.git
 * @returns HTTPS URL like https://github.com/user/repo.git
 */
function convertSshToHttps(sshUrl: string): string {
  const sshPattern = /^git@([^:]+):(.+)\.git$/;
  const match = sshUrl.match(sshPattern);
  
  if (match) {
    const [, hostname, repoPath] = match;
    return `https://${hostname}/${repoPath}.git`;
  }
  
  // If not SSH format, return original URL
  return sshUrl;
}

/**
 * Attempts to clone a git repository with fallback from SSH to HTTPS
 * @param repoUrl - Repository URL (SSH or HTTPS)
 * @param tmpFolder - Temporary folder to clone to
 * @param spinner - Optional ora spinner for status updates
 */
async function cloneWithFallback(
  repoUrl: string,
  tmpFolder: string,
  spinner?: any
): Promise<void> {
  try {
    // First attempt with original URL
    await execAsync(`git clone --depth 1 ${repoUrl} ${tmpFolder}`);
  } catch (sshError) {
    // If SSH clone fails, try HTTPS fallback
    const httpsUrl = convertSshToHttps(repoUrl);
    
    if (httpsUrl !== repoUrl) {
      if (spinner) {
        spinner.text = 'SSH clone failed, trying HTTPS fallback...';
      }
      
      try {
        await execAsync(`git clone --depth 1 ${httpsUrl} ${tmpFolder}`);
        if (spinner) {
          spinner.info('Successfully cloned using HTTPS fallback (SSH authentication not available)');
        }
      } catch (httpsError) {
        // Both methods failed, throw the original SSH error with additional context
        throw new Error(
          `Failed to clone repository. SSH Error: ${sshError}. HTTPS fallback also failed: ${httpsError}`
        );
      }
    } else {
      // Original URL wasn't SSH format, so no fallback possible
      throw sshError;
    }
  }
}

export async function cloneTemplate(
  template: AgentTemplate,
  destPath: string,
  client: XpanderClient,
  agentId: string,
  nonInteractive?: boolean,
  spinner?: any,
): Promise<void> {
  const tmpFolder = path.join(os.tmpdir(), `template_tmp_${Date.now()}`);
  let askedXpanderHandlerOverwrite = false;
  let overwriteXpanderHandler = false;
  let askedDockerfileOverwrite = false;
  let overwriteDockerfile = false;
  let askedDockerignoreOverwrite = false;
  let overwriteDockerignore = false;

  try {
    await cloneWithFallback(template.repositoryUrl, tmpFolder, spinner);
    const srcPath = template.folderName
      ? path.join(tmpFolder, template.folderName)
      : tmpFolder;

    if (template.folderName && !(await fileExists(srcPath))) {
      throw new Error(
        `Template folder "${template.folderName}" not found in repository. This template may not be ready yet.`,
      );
    }

    await fs.mkdir(destPath, { recursive: true });
    const files = await fs.readdir(srcPath);

    for (const file of files) {
      const baseExclusions = ['LICENSE', '.git', 'templates'];
      const isBaseTemplate = !template.folderName;
      const isTemplateFolder = file.endsWith('-template');
      if (
        baseExclusions.includes(file) ||
        (isBaseTemplate && isTemplateFolder)
      ) {
        continue;
      }

      const fileSrcPath = path.join(srcPath, file);
      const destFilePath = path.join(destPath, file);

      if (file === 'xpander_handler.py' && (await fileExists(destFilePath))) {
        if (nonInteractive) {
          overwriteXpanderHandler = false; // Don't overwrite in non-interactive mode
        } else if (!askedXpanderHandlerOverwrite) {
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
        if (!overwriteXpanderHandler) continue;
      }

      if (file === 'Dockerfile' && (await fileExists(destFilePath))) {
        if (nonInteractive) {
          overwriteDockerfile = false; // Don't overwrite in non-interactive mode
        } else if (!askedDockerfileOverwrite) {
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
        if (!overwriteDockerfile) continue;
      }

      if (file === '.dockerignore' && (await fileExists(destFilePath))) {
        if (nonInteractive) {
          overwriteDockerignore = false; // Don't overwrite in non-interactive mode
        } else if (!askedDockerignoreOverwrite) {
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
        if (!overwriteDockerignore) continue;
      }

      if (file === 'requirements.txt' && (await fileExists(destFilePath))) {
        const existing = (await fs.readFile(destFilePath))
          .toString()
          .split('\n');
        const incoming = (await fs.readFile(fileSrcPath))
          .toString()
          .split('\n');
        const merged = [...new Set([...existing, ...incoming])].filter(Boolean);
        await fs.writeFile(destFilePath, merged.join('\n'));
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

    // Handle .env and .env.example merge
    const envPath = path.join(destPath, '.env');
    const envExamplePath = path.join(destPath, '.env.example');
    const envVars: any = {
      XPANDER_API_KEY: `"${client.apiKey}"`,
      XPANDER_ORGANIZATION_ID: `"${client.orgId!}"`,
      XPANDER_AGENT_ID: `"${agentId}"`,
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
  } catch (error) {
    console.error('❌ Error during template clone:', error);
    throw error;
  } finally {
    if (fssync.existsSync(tmpFolder)) {
      fssync.rmSync(tmpFolder, { recursive: true, force: true });
    }
  }
}

export async function initializeAgentWithTemplate(
  client: XpanderClient,
  agentId: string,
  template: AgentTemplate,
  nonInteractive?: boolean,
  targetFolder?: string,
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

    // override to team template
    if (agent.is_coordinate_mode) {
      template = AGENT_TEMPLATES.find((tpl) => tpl.id == 'agno-team')!;
    }

    // Check if agent uses NeMo and modify template to use NeMo-specific folder
    if (
      agent.using_nemo &&
      (template.id === 'agno' || template.id === 'agno-team')
    ) {
      // Create a modified template that points to the NeMo-specific folder
      const nemoFolderName =
        template.id === 'agno-team'
          ? 'agno-nemo-template-team'
          : 'agno-nemo-template';
      template = {
        ...template,
        folderName: nemoFolderName,
        name: `${template.name} (NeMo)`,
      };
    }

    initializationSpinner.info(`Agent ${agent?.name} retrieved successfully`);

    let currentDirectory = targetFolder
      ? path.resolve(targetFolder.replace(/^~/, os.homedir()))
      : process.cwd();

    // Create target directory if it doesn't exist
    if (targetFolder) {
      await fs.mkdir(currentDirectory, { recursive: true });
    }

    if (!(await pathIsEmpty(currentDirectory))) {
      if (nonInteractive) {
        // In non-interactive mode, continue in specified/current directory
        // currentDirectory is already set above
      } else {
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
    }

    initializationSpinner.text = `Initializing ${agent?.name} with ${template.name} template`;
    await cloneTemplate(
      template,
      currentDirectory,
      client,
      agentId,
      nonInteractive,
      initializationSpinner,
    );

    // add NeMo config only for agents using NeMo
    if (agent.using_nemo) {
      await createNeMoConfigFile(agent, currentDirectory);
      console.log(chalk.green('✓ NeMo configuration file created'));
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
