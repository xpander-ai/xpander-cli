import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import open from 'open';
import ora from 'ora';
import { resolveAgentId } from '../../../utils/agent-resolver';
import { createClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
import { getXpanderConfigFromEnvFile } from '../../../utils/custom_agents_utils/generic';

export function registerEditCommand(agentCmd: Command): void {
  const editAction = async (options: any) => {
    try {
      const apiKey = getApiKey(options.profile);
      if (!apiKey) {
        console.error(chalk.red('No API key found.'));
        console.error(
          chalk.yellow(
            'Please run "xpander configure" to set up your credentials.',
          ),
        );
        return;
      }

      const client = createClient(options.profile);
      let agentId = options.agentId;

      // If no agent ID provided, try to get it from .env file
      if (!agentId) {
        try {
          const currentDirectory = process.cwd();
          const config = await getXpanderConfigFromEnvFile(currentDirectory);
          agentId = config.agent_id;
          console.log(chalk.blue(`Using agent ID from .env: ${agentId}`));
        } catch (error: any) {
          // No .env file found, show agent selection
          const spinner = ora('Fetching your agents...').start();
          try {
            const agentsResponse = await client.getAgents();
            const agents = agentsResponse || [];
            spinner.succeed('Agents loaded');

            if (agents.length === 0) {
              console.log(
                chalk.yellow(
                  'No agents found. Create one first with: xpander agent new',
                ),
              );
              return;
            }

            // Sort agents by creation date (newest first)
            const sortedAgents = [...agents].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );

            const { selectedAgentId } = await inquirer.prompt([
              {
                type: 'list',
                name: 'selectedAgentId',
                message: 'Select an agent to edit:',
                choices: sortedAgents.map((agent: any) => ({
                  name: `${agent.name} ${chalk.dim(`(${agent.id})`)}`,
                  value: agent.id,
                })),
                pageSize: 15,
              },
            ]);

            agentId = selectedAgentId;
          } catch (fetchError: any) {
            spinner.fail('Failed to fetch agents');
            console.error(
              chalk.red('Error fetching agents:'),
              fetchError.message || String(fetchError),
            );
            return;
          }
        }
      } else {
        // Resolve agent name to ID if needed
        const resolvedId = await resolveAgentId(client, agentId);
        if (!resolvedId) {
          return;
        }
        agentId = resolvedId;
      }

      const builderUrl = `https://app.xpander.ai/agents/${agentId}`;
      console.log(chalk.hex('#743CFF')(`Opening agent editor: ${builderUrl}`));

      await open(builderUrl);
    } catch (error: any) {
      if (error.status === 403) {
        console.error(
          chalk.red(
            'Authorization error: You lack permission for this action.',
          ),
        );
        console.error(
          chalk.yellow('Check your API key with "xpander profile --verify"'),
        );
      } else {
        console.error(
          chalk.red('Error opening agent editor:'),
          error.message || String(error),
        );
      }
    }
  };

  agentCmd
    .command('edit [agent]')
    .alias('o')
    .description('Open agent in browser for editing')
    .option('--agent-id <agent_id>', 'Agent name or ID to edit')
    .option('--agent-name <agent_name>', 'Agent name or ID to edit')
    .option('--profile <name>', 'Profile to use')
    .action(async (agent, options) => {
      // Use argument first, then flags
      const agentNameOrId = agent || options.agentId || options.agentName;
      await editAction({ ...options, agentId: agentNameOrId });
    });

  agentCmd
    .command('open [agent]')
    .description('Open agent in browser for editing')
    .option('--agent-id <agent_id>', 'Agent name or ID to edit')
    .option('--agent-name <agent_name>', 'Agent name or ID to edit')
    .option('--profile <name>', 'Profile to use')
    .action(async (agent, options) => {
      // Use argument first, then flags
      const agentNameOrId = agent || options.agentId || options.agentName;
      await editAction({ ...options, agentId: agentNameOrId });
    });
}
