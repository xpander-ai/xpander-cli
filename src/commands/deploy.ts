import { Command } from 'commander';
import { CommandType } from '../types';
import { getAgentIdFromEnvOrSelection } from '../utils/agent-resolver';
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
    .option('--confirm', 'Skip confirmation prompts')
    .option('--skip-local-tests', 'Skip local Docker container tests')
    .action(async (agentId, options) => {
      const client = createClient(options.profile);

      const resolvedAgentId = await getAgentIdFromEnvOrSelection(
        client,
        agentId,
      );
      if (!resolvedAgentId) {
        return;
      }

      await deployAgent(
        client,
        resolvedAgentId,
        options.confirm,
        options.skipLocalTests,
      );
    });

  return operationsCmd;
}
