import { Command } from 'commander';
import { CommandType } from '../types';
import { startAgent } from './agent/interactive/dev';

/**
 * Register dev command
 */
export function configureDevCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Dev} [agent]`)
    .description('Run agent locally')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId, _options) => {
      await startAgent(agentId);
    });

  return operationsCmd;
}
