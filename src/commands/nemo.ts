import { Command } from 'commander';
import { CommandType } from '../types';
import { registerPullCommand } from './nemo/commands/pull';
import { registerPushCommand } from './nemo/commands/push';

/**
 * Configure NeMo-related commands
 */
export function nemo(program: Command): void {
  const nemoCmd = program
    .command(CommandType.NeMo)
    .description('Manage NeMo configuration sync with agents');

  // Register NeMo sub-commands
  registerPullCommand(nemoCmd);
  registerPushCommand(nemoCmd);
}
