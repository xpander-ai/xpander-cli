import { Command } from 'commander';
import { registerInvokeCommand } from './agent/commands/invoke';

/**
 * Configure top-level invoke command (alias for agent invoke)
 */
export function configureInvokeCommand(program: Command): Command {
  // Create a temporary command group for registering invoke
  const tempCmd = new Command();
  registerInvokeCommand(tempCmd);

  // Get the invoke command that was registered
  const invokeCommand = tempCmd.commands.find((cmd) => cmd.name() === 'invoke');

  if (invokeCommand) {
    // Add it to the main program
    program.addCommand(invokeCommand);
  }

  return program;
}
