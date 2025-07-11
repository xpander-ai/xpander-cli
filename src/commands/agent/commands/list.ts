import chalk from 'chalk';
import { Command } from 'commander';
import { CommandType } from '../../../types';
import { createClient } from '../../../utils/client';
import { getApiKey } from '../../../utils/config';
import { formatOutput } from '../../../utils/formatter';

/**
 * Register list-related commands
 */
export function registerListCommand(agentCmd: Command): void {
  // List all agents
  agentCmd
    .command(CommandType.List)
    .description('List all agents')
    .option('--json', 'Output in JSON format')
    .option('--all', 'Show all agents, including inactive ones')
    .option('--full', 'Show full API response with all fields')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
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

        console.log('');
        console.log('');
        console.log(chalk.cyan('🤖 Your Agents'));
        console.log('──────────────────────────────────────────────────');

        const client = createClient(options.profile);
        const agentsList = await client.getAgents();

        if (!agentsList || agentsList.length === 0) {
          console.log(chalk.yellow('No agents found.'));
          console.log(
            chalk.yellow('Use "xpander agent new" to create your first agent.'),
          );
          console.log('──────────────────────────────────────────────────');
          return;
        }

        // Filter inactive agents if not showing all
        const filteredAgents = options.all
          ? agentsList
          : agentsList.filter((agentItem) => {
              // Only filter by active status
              return agentItem.status === 'ACTIVE';
            });

        // Use JSON format if requested
        if (options.json) {
          console.log(JSON.stringify(filteredAgents, null, 2));
          return;
        }

        // Show full API response if requested
        if (options.full) {
          console.log(JSON.stringify(agentsList, null, 2));
          return;
        }

        // Sort agents by creation date (newest first)
        filteredAgents.sort((a, b) => {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        // Prepare agents data with formatted fields for better display
        const formattedAgents = filteredAgents.map((agentItem) => {
          // Format the date properly
          let createdDate = '';
          try {
            createdDate = new Date(agentItem.created_at).toLocaleDateString();
          } catch (e) {
            // If date parsing fails, use the raw value
            createdDate = agentItem.created_at || '';
          }

          // Process data for better table display
          const isStaging = process?.env?.IS_STG === 'true';
          const baseUrl = isStaging
            ? 'https://stg.app.xpander.ai'
            : 'https://app.xpander.ai';

          return {
            name: agentItem.name,
            created_at: createdDate,
            link: `${baseUrl}/agents/${agentItem.id}`,
          };
        });

        // Display in table format
        formatOutput(formattedAgents, {
          title: '', // Remove title as we're adding our own
          columns: ['name', 'created_at', 'link'],
          headers: ['Name', 'Created', 'Link'],
        });

        console.log('──────────────────────────────────────────────────');
        console.log(`Total agents: ${filteredAgents.length}`);
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
            chalk.red('Error fetching agents:'),
            error.message || String(error),
          );
        }
      }
    });

  // List agents in JSON format (alias for list --json)
  agentCmd
    .command(CommandType.ListJson)
    .description('List all agents in raw JSON format')
    .option('--all', 'Show all agents, including inactive ones')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      // Simply execute the list command's action with the json flag set
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
        const agentsList = await client.getAgents();

        if (!agentsList || agentsList.length === 0) {
          console.log(chalk.yellow('No agents found.'));
          console.log(
            chalk.yellow('Use "xpander agent new" to create your first agent.'),
          );
          return;
        }

        // Filter inactive agents if not showing all (same logic as list command)
        const filteredAgents = options.all
          ? agentsList
          : agentsList.filter((agentItem) => {
              // 1. Must be active
              if (agentItem.status !== 'ACTIVE') return false;

              // 2. Must have multiple tools
              if (!agentItem.tools || agentItem.tools.length <= 1) return false;

              return true;
            });

        // Output in JSON format (that's the whole purpose of list-json)
        console.log(JSON.stringify(filteredAgents, null, 2));
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
            chalk.red('Error fetching agents:'),
            error.message || String(error),
          );
        }
      }
    });
}
