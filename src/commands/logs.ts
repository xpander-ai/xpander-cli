import { Command } from 'commander';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { getAgentLogs } from './agent/interactive/logs';

/**
 * Register logs command
 */
export function configureLogsCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Logs}`)
    .description('Live logs of your deployed AI Agent')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      const client = createClient(options.profile);
      await getAgentLogs(client);
    });

  return operationsCmd;
}
