import { Command } from 'commander';
import { configureGraphCommands } from '../agent-graph';
import { registerDeleteCommand } from './commands/delete';
import { registerEditCommand } from './commands/edit';
import { registerGetCommand } from './commands/get';
import { registerInitCommand } from './commands/init';
import { registerInvokeCommand } from './commands/invoke';
import { registerListCommand } from './commands/list';
import { registerNewCommand } from './commands/new';
import { registerTemplatesCommand } from './commands/templates';
import { registerUpdateCommand } from './commands/update';
import { interactiveAgentMode } from './interactive/index';
import { configureToolsCommands } from './tools';
import { CommandType } from '../../types';

/**
 * Configure agent-related commands
 */
export function agent(program: Command): void {
  const agentCmd = program
    .command(CommandType.Agent)
    .alias('a')
    .description('Manage agents');

  // Add interactive mode as the default command when just running 'xpander agent'
  agentCmd.action(async () => {
    await interactiveAgentMode();
  });

  // Interactive mode (explicitly called via 'agent interactive')
  agentCmd
    .command(CommandType.Interactive)
    .description('Interactive agent management mode')
    .action(async () => {
      await interactiveAgentMode();
    });

  // Register all agent sub-commands
  registerListCommand(agentCmd);
  registerGetCommand(agentCmd);
  registerInitCommand(agentCmd);
  registerNewCommand(agentCmd);
  registerTemplatesCommand(agentCmd);
  registerDeleteCommand(agentCmd);
  registerUpdateCommand(agentCmd);
  registerEditCommand(agentCmd);
  registerInvokeCommand(agentCmd);

  // Add agent operation subcommands
  agentCmd
    .command('logs [agent]')
    .alias('l')
    .description('View agent logs')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId, options) => {
      const { createClient } = await import('../../utils/client');
      const { getAgentLogs } = await import('./interactive/logs');
      const client = createClient(options.profile);
      await getAgentLogs(client, agentId);
    });

  agentCmd
    .command('deploy [agent]')
    .alias('d')
    .description('Deploy agent')
    .option('--profile <n>', 'Profile to use')
    .option(
      '--path <path>',
      'Path to agent directory (defaults to current directory)',
    )
    .option('--confirm', 'Skip confirmation prompts')
    .option('--skip-local-tests', 'Skip local Docker container tests')
    .action(async (agentId, options) => {
      const { createClient } = await import('../../utils/client');
      const { getAgentIdFromEnvOrSelection } = await import(
        '../../utils/agent-resolver'
      );
      const { deployAgent } = await import('./interactive/deploy');
      const client = createClient(options.profile);
      const resolvedAgentId = await getAgentIdFromEnvOrSelection(
        client,
        agentId,
      );
      if (!resolvedAgentId) return;
      await deployAgent(
        client,
        resolvedAgentId,
        options.confirm,
        options.skipLocalTests,
        options.path,
      );
    });

  agentCmd
    .command('dev [agent]')
    .description('Run agent locally')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId) => {
      const { startAgent } = await import('./interactive/dev');
      await startAgent(agentId);
    });

  agentCmd
    .command('restart [agent]')
    .description('Restart agent')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId, options) => {
      const { restartAgent } = await import('../restart');
      const { createClient } = await import('../../utils/client');
      const client = createClient(options.profile);
      await restartAgent(client, agentId);
    });

  agentCmd
    .command('stop [agent]')
    .description('Stop agent')
    .option('--profile <n>', 'Profile to use')
    .action(async (agentId, options) => {
      const { stopAgent } = await import('../stop');
      const { createClient } = await import('../../utils/client');
      const client = createClient(options.profile);
      await stopAgent(client, agentId);
    });

  // Register graph and tools commands
  configureGraphCommands(agentCmd);
  configureToolsCommands(agentCmd);
}
