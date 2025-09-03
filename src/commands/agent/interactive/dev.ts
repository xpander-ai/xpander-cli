import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../../../utils/client';
import { ensureAgentIsInitialized } from '../../../utils/custom-agents';
import { getXpanderConfigFromEnvFile } from '../../../utils/custom_agents_utils/generic';
import { syncNeMoConfigFile } from '../../../utils/nemo';

async function findPythonExecutable(): Promise<string> {
  const venv = process.env.VIRTUAL_ENV;
  if (venv) {
    const venvPython = join(venv, 'bin', 'python');
    if (existsSync(venvPython)) return venvPython;
  }

  const candidates = ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      const which = spawn('which', [cmd]);
      await new Promise((resolve, reject) => {
        which.on('error', reject);
        which.on('exit', (code) => (code === 0 ? resolve(null) : reject()));
      });
      return cmd;
    } catch {
      continue;
    }
  }

  throw new Error('Python executable not found.');
}

/**
 * Start agent locally and keep process running
 */
export async function startAgent(providedAgentId?: string) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Starting agent in dev mode'));
  console.log(chalk.dim('─'.repeat(60)));

  const devModeSpinner = ora('Initializing local dev mode').start();
  const currentDirectory = process.cwd();

  // If agent ID provided, we assume user wants to run in that directory
  // Otherwise ensure current directory is initialized
  if (!providedAgentId) {
    const isInitialized = await ensureAgentIsInitialized(
      currentDirectory,
      devModeSpinner,
    );
    if (!isInitialized) return;
  }

  try {
    const config = await getXpanderConfigFromEnvFile(currentDirectory);
    const agentId = providedAgentId || config.agent_id;

    if (!agentId) {
      devModeSpinner.fail(
        'No agent ID found. Please provide an agent ID or run in an initialized agent directory.',
      );
      return;
    }

    const client = createClient();
    await syncNeMoConfigFile(agentId, client, currentDirectory, devModeSpinner);

    devModeSpinner.text = `Starting agent ${agentId}`;

    const python = await findPythonExecutable();
    devModeSpinner.stop();

    console.log(chalk.green(`\n▶ Running: ${python} xpander_handler.py\n`));
    console.log(chalk.dim('─'.repeat(60)));

    const child = spawn(python, ['xpander_handler.py'], {
      cwd: currentDirectory,
      env: process.env,
      stdio: ['inherit', 'inherit', 'inherit'],
    });

    // Handle process termination
    const shutdown = () => {
      console.log(chalk.yellow('\nGracefully stopping agent...'));
      child.kill('SIGTERM');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Prevent parent from exiting until child is done
    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('\n✅ Agent exited successfully.'));
        } else {
          console.error(chalk.red(`\n❌ Agent exited with code ${code}`));
        }
        resolve();
      });
    });
  } catch (error: any) {
    devModeSpinner.fail('Failed to start agent');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
