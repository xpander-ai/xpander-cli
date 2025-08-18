import { Command } from 'commander';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { syncSecrets } from './agent/interactive/secrets-sync';

/**
 * Register secrets sync command
 */
export function configureSecretsSyncCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.SecretsSync}`)
    .description('Sync .env to deployed agent')
    .option('--profile <n>', 'Profile to use')
    .action(async (options) => {
      const client = createClient(options.profile);
      await syncSecrets(client);
    });

  return operationsCmd;
}
