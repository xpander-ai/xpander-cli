import { Command } from 'commander';
import { CommandType } from '../types';
import { startAgent } from './agent/interactive/dev';

/**
 * Register dev command
 */
export function configureDevCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Dev}`)
    .description('Start your agent in debug mode')
    .option('--profile <n>', 'Profile to use')
    .action(async () => {
      await startAgent();
    });

  return operationsCmd;
}
