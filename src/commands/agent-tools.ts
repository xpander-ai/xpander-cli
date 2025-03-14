import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { XpanderClient, createClient } from '../utils/client';
import { getApiKey } from '../utils/config';

/**
 * Configure tool commands for agent
 */
export function configureToolsCommands(agentCmd: Command): void {
  // Add tools command group
  const toolsCmd = agentCmd
    .command('tools')
    .description('Manage agentic interfaces and operations');

  // List available interfaces
  toolsCmd
    .command('interfaces')
    .description('List available agentic interfaces')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);

        const interfacesSpinner = ora(
          'Retrieving agentic interfaces...',
        ).start();
        const interfaces = await client.getAgenticInterfaces();
        interfacesSpinner.stop();

        if (!interfaces || interfaces.length === 0) {
          console.log(chalk.yellow('No agentic interfaces available.'));
          return;
        }

        console.log('');
        console.log(chalk.cyan('Available Interfaces:'));
        console.log('');

        interfaces.forEach((iface: any) => {
          console.log(
            `${chalk.bold(iface.name)} ${chalk.dim(`(${iface.id})`)}`,
          );
          console.log(chalk.dim(iface.description));
          console.log(
            `${chalk.yellow('Operations:')} ${iface.operations.length}`,
          );
          console.log('');
        });
      } catch (error: any) {
        console.error(
          chalk.red('Failed to retrieve agentic interfaces:'),
          error.message || String(error),
        );
      }
    });

  // List operations for an interface
  toolsCmd
    .command('operations')
    .description('List operations for an agentic interface')
    .option('--interface <id>', 'Interface ID')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);

        // Get/prompt for interface ID
        let interfaceId = options.interface;
        if (!interfaceId) {
          const interfacesSpinner = ora('Loading interfaces...').start();
          const interfaces = await client.getAgenticInterfaces();
          interfacesSpinner.stop();

          if (!interfaces || interfaces.length === 0) {
            console.log(chalk.yellow('No agentic interfaces available.'));
            return;
          }

          const { selectedInterface } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedInterface',
              message: 'Select an interface:',
              choices: interfaces.map((iface: any) => ({
                name: `${iface.name} ${chalk.dim(`(${iface.id})`)}`,
                value: iface.id,
              })),
              pageSize: 15,
            },
          ]);

          interfaceId = selectedInterface;
        }

        const opsSpinner = ora('Loading operations...').start();
        const operations = await client.getInterfaceOperations(
          interfaceId || '',
        );
        opsSpinner.stop();

        if (!operations || operations.length === 0) {
          console.log(
            chalk.yellow(
              `No operations available for interface ${interfaceId}.`,
            ),
          );
          return;
        }

        console.log('');
        console.log(chalk.cyan('Available Operations:'));
        console.log('');

        operations.forEach((op: any) => {
          console.log(`${chalk.bold(op.name)} ${chalk.dim(`(${op.id})`)}`);
          console.log(chalk.dim(op.description));
          console.log(
            `${chalk.yellow('Input Type:')} ${op.input_type || 'Not specified'}`,
          );
          console.log(
            `${chalk.yellow('Output Type:')} ${
              op.output_type || 'Not specified'
            }`,
          );
          console.log('');
        });
      } catch (error: any) {
        console.error(
          chalk.red('Failed to retrieve operations:'),
          error.message || String(error),
        );
      }
    });

  // Attach operations to an agent
  toolsCmd
    .command('attach')
    .description('Attach operations to an agent')
    .option('--agent <id>', 'Agent ID to attach operations to')
    .option('--interface <id>', 'Interface ID to get operations from')
    .option('--profile <name>', 'Profile to use')
    .action(async (options) => {
      try {
        const apiKey = getApiKey(options.profile);
        if (!apiKey) {
          console.error(chalk.red('No API key found.'));
          console.error(
            chalk.yellow(
              'Please run "xpander configure" to set up your credentials.',
            ),
          );
          return;
        }

        const client = createClient(options.profile);

        // Get/prompt for agent ID
        let agentId = options.agent;
        if (!agentId) {
          const agentSpinner = ora('Loading agents...').start();
          const agentList = await client.getAgents();
          agentSpinner.stop();

          if (!agentList || agentList.length === 0) {
            console.log(chalk.yellow('No agents found.'));
            console.log('Use "xpander agent new" to create your first agent.');
            return;
          }

          const { selectedAgent } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedAgent',
              message: 'Select an agent to attach operations to:',
              choices: agentList.map((a) => ({
                name: `${a.name} ${chalk.dim(`(${a.id})`)}`,
                value: a.id,
              })),
              pageSize: 15,
            },
          ]);

          agentId = selectedAgent;
        }

        await attachOperationsInteractive(client, agentId, options.interface);
      } catch (error: any) {
        console.error(
          chalk.red('Failed to attach operations:'),
          error.message || String(error),
        );
      }
    });
}

/**
 * Attach operations to an agent interactively
 */
export async function attachOperationsInteractive(
  client: XpanderClient,
  agentId: string,
  interfaceId?: string,
): Promise<boolean> {
  try {
    // Get interfaces if not provided
    if (!interfaceId) {
      const interfacesSpinner = ora('Loading interfaces...').start();
      const interfaces = await client.getAgenticInterfaces();
      interfacesSpinner.stop();

      if (!interfaces || interfaces.length === 0) {
        console.log(chalk.yellow('No agentic interfaces available.'));
        return false;
      }

      const { selectedInterface } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedInterface',
          message: 'Select an interface to get operations from:',
          choices: interfaces.map((iface: any) => ({
            name: `${iface.name} ${chalk.dim(`(${iface.id})`)}`,
            value: iface.id,
          })),
          pageSize: 15,
        },
      ]);

      interfaceId = selectedInterface;
    }

    // Get operations
    const opsSpinner = ora('Loading operations...').start();
    const operations = await client.getInterfaceOperations(interfaceId || '');
    opsSpinner.stop();

    if (!operations || operations.length === 0) {
      console.log(
        chalk.yellow(`No operations available for interface ${interfaceId}.`),
      );
      return false;
    }

    // Show current tools
    const agentSpinner = ora('Loading agent details...').start();
    const agentData = await client.getAgent(agentId);
    agentSpinner.stop();

    if (!agentData) {
      console.log(chalk.yellow(`Agent with ID ${agentId} not found.`));
      return false;
    }

    const currentTools = agentData.tools || [];
    const currentToolIds = currentTools.map((t: any) => t.id);

    console.log('');
    if (currentTools.length > 0) {
      console.log(chalk.cyan('Current attached operations:'));
      currentTools.forEach((tool: any) => {
        console.log(`- ${tool.name} ${chalk.dim(`(${tool.id})`)}`);
      });
      console.log('');
    }

    // Select operations to attach
    const { selectedOperations } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedOperations',
        message: 'Select operations to attach to the agent:',
        choices: operations.map((op: any) => ({
          name: `${op.name} ${chalk.dim(`(${op.id})`)}`,
          value: op.id,
          checked: currentToolIds.includes(op.id),
        })),
        pageSize: 15,
      },
    ]);

    if (selectedOperations.length === 0) {
      console.log(chalk.yellow('No operations selected.'));
      return false;
    }

    // Format into payload
    const toolsPayload = selectedOperations.map((id: string) => ({
      id,
    }));

    // Attach to agent
    const attachSpinner = ora('Attaching operations...').start();
    const success = await client.attachAgentTools(agentId, toolsPayload);
    attachSpinner.stop();

    if (success) {
      console.log(
        chalk.green(
          `Successfully attached ${selectedOperations.length} operations to agent.`,
        ),
      );

      // Ask if they want to create a graph now
      const { createGraph } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createGraph',
          message: 'Would you like to create an operation graph now?',
          default: true,
        },
      ]);

      if (createGraph) {
        // Note: This will now be handled by the main agent interactive function
        // instead of calling directly, to avoid circular dependencies
        console.log(
          chalk.cyan(
            'Please use the graph command to create an operation graph.',
          ),
        );
      }

      return true;
    } else {
      console.log(chalk.red('Failed to attach operations to agent.'));
      return false;
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error attaching operations:'),
      error.message || String(error),
    );
    return false;
  }
}

/**
 * Show available agentic interfaces
 */
export async function browseAgenticInterfaces(client: XpanderClient) {
  try {
    const interfacesSpinner = ora('Loading interfaces...').start();
    const interfaces = await client.getAgenticInterfaces();
    interfacesSpinner.stop();

    if (!interfaces || interfaces.length === 0) {
      console.log(chalk.yellow('No agentic interfaces available.'));
      return;
    }

    console.log('');
    console.log(chalk.bold.cyan('🧩 Available Agentic Interfaces'));
    console.log(chalk.dim('─'.repeat(60)));

    interfaces.forEach((iface: any, index: number) => {
      console.log(
        `${index + 1}. ${chalk.bold(iface.name)} ${chalk.dim(`(${iface.id})`)}`,
      );
      console.log(`   ${chalk.dim(iface.description)}`);
      console.log(
        `   ${chalk.yellow('Operations:')} ${iface.operations.length}`,
      );
      console.log('');
    });

    // Prompt to view operations for a specific interface
    const { action, interfaceIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'View operations for an interface', value: 'view' },
          { name: 'Return to main menu', value: 'exit' },
        ],
      },
      {
        type: 'list',
        name: 'interfaceIndex',
        message: 'Select an interface to view:',
        choices: interfaces.map((iface: any, index: number) => ({
          name: `${index + 1}. ${iface.name}`,
          value: index,
        })),
        when: (answers) => answers.action === 'view',
      },
    ]);

    if (action === 'view') {
      const selectedInterface = interfaces[interfaceIndex];

      const opsSpinner = ora('Loading operations...').start();
      const operations = await client.getInterfaceOperations(
        selectedInterface.id,
      );
      opsSpinner.stop();

      if (!operations || operations.length === 0) {
        console.log(
          chalk.yellow(
            `No operations available for interface ${selectedInterface.name}.`,
          ),
        );
        return;
      }

      console.log('');
      console.log(
        chalk.bold.cyan(
          `🔧 Operations for ${selectedInterface.name} (${operations.length})`,
        ),
      );
      console.log(chalk.dim('─'.repeat(60)));

      operations.forEach((op: any, index: number) => {
        console.log(
          `${index + 1}. ${chalk.bold(op.name)} ${chalk.dim(`(${op.id})`)}`,
        );
        console.log(`   ${chalk.dim(op.description)}`);
        console.log(
          `   ${chalk.yellow('Input:')} ${op.input_type || 'Not specified'}`,
        );
        console.log(
          `   ${chalk.yellow('Output:')} ${op.output_type || 'Not specified'}`,
        );
        console.log('');
      });
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error browsing interfaces:'),
      error.message || String(error),
    );
  }
}

/**
 * View tools attached to an agent
 */
export async function viewAgentTools(client: XpanderClient, agentId: string) {
  try {
    const agentSpinner = ora('Loading agent details...').start();
    const agentData = await client.getAgent(agentId);
    agentSpinner.stop();

    if (!agentData) {
      console.log(chalk.yellow(`Agent with ID ${agentId} not found.`));
      return;
    }

    const tools = agentData.tools || [];

    console.log('');
    console.log(
      chalk.bold.cyan(`🔧 Tools for ${agentData.name} (${tools.length})`),
    );
    console.log(chalk.dim('─'.repeat(60)));

    if (tools.length === 0) {
      console.log(chalk.yellow('This agent has no tools attached.'));
      console.log('Use "xpander agent tools attach" to attach tools.');
      return;
    }

    tools.forEach((tool: any, index: number) => {
      console.log(
        `${index + 1}. ${chalk.bold(tool.name)} ${chalk.dim(`(${tool.id})`)}`,
      );
      console.log(`   ${chalk.dim(tool.description || 'No description')}`);
      console.log('');
    });

    // Show options
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Manage agent tools', value: 'manage' },
          { name: 'Return to agent menu', value: 'exit' },
        ],
      },
    ]);

    if (action === 'manage') {
      await attachOperationsInteractive(client, agentId);
    }
  } catch (error: any) {
    console.error(
      chalk.red('Error viewing agent tools:'),
      error.message || String(error),
    );
  }
}

/**
 * Manage agent tools interactively
 */
export async function manageAgentTools(client: XpanderClient, agents: any[]) {
  // Select an agent first
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: 'Select an agent to manage tools for:',
      choices: agents.map((agentEntry) => ({
        name: `${agentEntry.name} ${chalk.dim(`(${agentEntry.id})`)}`,
        value: agentEntry.id,
      })),
      pageSize: 15,
    },
  ]);

  await viewAgentTools(client, agentId);
}
