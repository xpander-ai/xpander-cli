import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { XPanderConfig } from '../../../types';
import { XpanderClient } from '../../../utils/client';
import { fileExists, pathIsEmpty } from '../../../utils/custom-agents';
import { streamLogs } from '../../../utils/custom_agents_utils/logs';

const requiredFiles = ['xpander_config.json'];

export async function getAgentLogs(client: XpanderClient) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Agent Logs'));
  console.log(chalk.dim('─'.repeat(60)));

  const logsSpinner = ora(`Initializing logs stream...`).start();
  try {
    const currentDirectory = process.cwd();

    if (await pathIsEmpty(currentDirectory)) {
      logsSpinner.fail(
        'Current directory is empty. Please initialize and deploy your agent first.',
      );
      return;
    }

    const missingFiles = await Promise.all(
      requiredFiles.map(async (file) =>
        !(await fileExists(`${currentDirectory}/${file}`)) ? file : null,
      ),
    ).then((results) =>
      results.filter((file): file is string => file !== null),
    );

    if (missingFiles.length !== 0) {
      logsSpinner.fail(
        `Missing required files: ${missingFiles.join(', ')}. Re-initialize your agent.`,
      );
      return;
    }

    const configContent = await fs.readFile(
      `${currentDirectory}/xpander_config.json`,
      'utf-8',
    );
    const config: XPanderConfig = JSON.parse(configContent);

    const agent = await client.getAgent(config.agent_id);
    if (!agent) {
      logsSpinner.fail(`Agent with ID ${config.agent_id} not found.`);
      return;
    }

    logsSpinner.text = `Starting log stream for ${agent.name}. Press Ctrl+C to stop.`;

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      logsSpinner.stop();
      console.log(chalk.yellow('\nStream interrupted by user.'));
      process.exit(0);
    });

    await streamLogs(logsSpinner, client, agent.id);
  } catch (error: any) {
    logsSpinner.fail('Failed to retrieve agent logs.');
    console.error(chalk.red('Error:'), error?.message || String(error));
  }
}
