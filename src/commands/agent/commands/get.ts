import chalk from 'chalk';
import { Command } from 'commander';
import { resolveAgentId } from '../../../utils/agent-resolver';
import { createClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
import { colorizeStatus } from '../helpers/format';

/**
 * Register get command to view agent details
 */
export function registerGetCommand(agentCmd: Command): void {
  // Get details about a specific agent
  agentCmd
    .command('get <agent>')
    .alias('g')
    .description('Get details about an agent')
    .option('--agent-id <agent_id>', 'Agent name or ID to get details for')
    .option('--agent-name <agent_name>', 'Agent name or ID to get details for')
    .option('--json', 'Output in JSON format')
    .option('--profile <name>', 'Profile to use')
    .action(async (agent, options) => {
      // Use argument first, then flags
      const agentNameOrId = agent || options.agentId || options.agentName;
      const updatedOptions = { ...options, id: agentNameOrId };

      try {
        const apiKey = getApiKey(updatedOptions.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(updatedOptions.profile);

        // Resolve agent name to ID if needed
        const agentId = await resolveAgentId(client, updatedOptions.id);
        if (!agentId) {
          return;
        }

        const agentDetails = await client.getAgent(agentId);

        if (!agentDetails) {
          console.error(chalk.red(`Agent with ID "${options.id}" not found.`));
          return;
        }

        if (updatedOptions.json) {
          console.log(JSON.stringify(agentDetails, null, 2));
          return;
        }

        console.log('');
        console.log('');
        console.log(chalk.hex('#743CFF')('⦻ Agent Details'));
        console.log('──────────────────────────────────────────────────');

        // Display agent details in a readable format
        console.log(`Name:     ${chalk.hex('#743CFF')(agentDetails.name)}`);
        console.log(`ID:       ${agentDetails.id}`);
        console.log(`Status:   ${colorizeStatus(agentDetails.status)}`);
        console.log(`Type:     ${agentDetails.type || 'regular'}`);
        console.log(`Model:    ${agentDetails.model_name || 'gpt-4o'}`);
        console.log(`Version:  ${agentDetails.version || 1}`);
        console.log(`Tools:    ${agentDetails.tools?.length || 0}`);
        console.log(`Icon:     ${agentDetails.icon || '🤖'}`);

        // Format date nicely
        const created = new Date(agentDetails.created_at);
        console.log(`Created:  ${created.toLocaleDateString()}`);

        // Display instructions if available
        console.log('');
        console.log('Instructions:');
        if (agentDetails.instructions?.role)
          console.log(`• Role:    ${agentDetails.instructions.role}`);
        if (agentDetails.instructions?.goal)
          console.log(`• Goal:    ${agentDetails.instructions.goal}`);
        if (agentDetails.instructions?.general)
          console.log(`• General: ${agentDetails.instructions.general}`);

        console.log('──────────────────────────────────────────────────');
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
        } else if (error.status === 404) {
          console.error(
            chalk.red(`Agent with ID "${updatedOptions.id}" not found.`),
          );
        } else {
          console.error(
            chalk.red('Error fetching agent:'),
            error.message || String(error),
          );
        }
      }
    });
}
