import { Command } from 'commander';
import { CommandType } from '../types';
import { createClient } from '../utils/client';
import { deployAgent } from './agent/interactive/deploy';

/**
 * Register deploy command
 */
export function configureDeployCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Deploy} [agent]`)
    .alias('d')
    .description('Deploy agent')
    .option('--profile <n>', 'Profile to use')
    .option(
      '--path <path>',
      'Path to agent directory (defaults to current directory)',
    )
    .option('--confirm', 'Skip confirmation prompts')
    .option('--skip-local-tests', 'Skip local Docker container tests')
    .action(async (agentId, options, command) => {
      // Check if --profile was explicitly provided in command line
      const profileExplicitlySet =
        command.parent?.rawArgs.includes('--profile');

      const client = createClient(options.profile);

      await deployAgent(
        client,
        agentId,
        options.confirm,
        options.skipLocalTests,
        options.path,
        profileExplicitlySet || false, // Use profile credentials if --profile was explicitly set
      );
    });

  return operationsCmd;
}
