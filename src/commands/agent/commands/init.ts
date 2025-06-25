import { Command } from 'commander';
import { createClient } from '../../../utils/client';
import { initializeAgent } from '../interactive/initialize';

/**
 * Register init command for agents
 */
export function registerInitCommand(parentCommand: Command): void {
  parentCommand
    .command('init [agent-id]')
    .description('Initialize an existing agent into current directory')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId, options) => {
      const client = createClient(options.profile);
      await initializeAgent(client, agentId);
    });
}
