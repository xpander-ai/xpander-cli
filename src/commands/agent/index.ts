import { Command } from 'commander';
import { configureGraphCommands } from '../agent-graph';
import { registerDeleteCommand } from './commands/delete';
import { registerGetCommand } from './commands/get';
import { registerListCommand } from './commands/list';
import { registerNewCommand } from './commands/new';
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
  registerNewCommand(agentCmd);
  registerDeleteCommand(agentCmd);
  registerUpdateCommand(agentCmd);

  // Register graph and tools commands
  configureGraphCommands(agentCmd);
  configureToolsCommands(agentCmd);
}
