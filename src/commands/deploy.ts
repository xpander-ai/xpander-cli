import { Command } from 'commander';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { deployAgent } from './agent/interactive/deploy';

/**
 * Register deploy command
 */
export function configureDeployCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Deploy}`)
    .description('Deploy your AI Agent')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      const client = createClient(options.profile);
      await deployAgent(client);
    });

  return operationsCmd;
}
