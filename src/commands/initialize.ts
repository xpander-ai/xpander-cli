import { Command } from 'commander';
import { CommandType } from '../types';
import { registerInitCommand } from './agent/commands/init';

/**
 * Register init command
 */
export function configureInitializeCommand(program: Command): Command {
  const initCmd = program
    .command(`${CommandType.Initialize}`)
    .alias('i')
    .description('Initialize agent in current directory')
    .option('--profile <n>', 'Profile to use')
    .argument('[agent]', 'Agent name or ID to initialize')
    .option(
      '--framework <framework>',
      'Framework template to use (agno, agno-team, base)',
    )
    .option(
      '--folder <folder>',
      'Folder to initialize agent in (enables non-interactive mode)',
    )
    .option('--agno', 'Use Agno template (deprecated: use --framework agno)')
    .option('--base', 'Use Base template (deprecated: use --framework base)')
    .option('--template', 'Use template selection for initialization')
    .action(async (agentId, options) => {
      // This is now just a shortcut to agent init - delegate to the agent init command
      const agentInitCommand = new Command('init');
      registerInitCommand(agentInitCommand);

      // Convert legacy options to new format
      if (options.agno && !options.framework) {
        options.framework = 'agno';
      }
      if (options.base && !options.framework) {
        options.framework = 'base';
      }

      // Execute the agent init command with the same options
      const initSubCommand = agentInitCommand.commands[0];
      await initSubCommand.parseAsync(
        [
          agentId,
          ...Object.entries(options).flatMap(([key, value]) =>
            value === true ? [`--${key}`] : value ? [`--${key}`, value] : [],
          ),
        ],
        { from: 'user' },
      );
    });

  return initCmd;
}
