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
    .option(
      '--path <path>',
      'Path to agent directory (defaults to current directory)',
    )
    .action(async (agentId, options) => {
      await startAgent(agentId, options.path);
    });

  return operationsCmd;
}
