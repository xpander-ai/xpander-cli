import { Command } from 'commander';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { initializeAgent } from './agent/interactive/initialize';

/**
 * Register init command
 */
export function configureInitializeCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Initialize}`)
    .description('Initialize AI Agent into current workdir')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      const client = createClient(options.profile);
      await initializeAgent(client);
    });

  return operationsCmd;
}
