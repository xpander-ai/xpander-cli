import { Command } from 'commander';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { getAgentLogs } from './agent/interactive/logs';

/**
 * Register logs command - shortcut to agent logs
 */
export function configureLogsCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Logs} [agent]`)
    .description('View agent logs (shortcut to agent logs)')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId, options) => {
      const client = createClient(options.profile);
      await getAgentLogs(client, agentId);
    });

  return operationsCmd;
}
