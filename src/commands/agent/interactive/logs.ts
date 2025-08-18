import chalk from 'chalk';
import ora from 'ora';
import { getAgentIdFromEnvOrSelection } from '../../../utils/agent-resolver';
import { XpanderClient } from '../../../utils/client';
import { streamLogs } from '../../../utils/custom_agents_utils/logs';

export async function getAgentLogs(
  client: XpanderClient,
  providedAgentId?: string,
) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Agent Logs'));
  console.log(chalk.dim('─'.repeat(60)));

  let logsSpinner: any;
  try {
    const agentId = await getAgentIdFromEnvOrSelection(client, providedAgentId);
    if (!agentId) {
      console.log(chalk.yellow('No agent selected.'));
      return;
    }

    const agent = await client.getAgent(agentId);
    if (!agent) {
      console.log(chalk.red(`Agent with ID ${agentId} not found.`));
      return;
    }

    logsSpinner = ora(
      `Starting log stream for ${agent.name}. Press Ctrl+C to stop.`,
    ).start();

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      logsSpinner.stop();
      console.log(chalk.yellow('\nStream interrupted by user.'));
      process.exit(0);
    });

    await streamLogs(logsSpinner, client, agent.id);
  } catch (error: any) {
    if (logsSpinner) {
      logsSpinner.fail('Failed to retrieve agent logs.');
    }
    console.error(chalk.red('Error:'), error?.message || String(error));
  }
}
