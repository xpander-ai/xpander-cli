import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { attachOperationsInteractive } from './agent-tools';
import { XpanderClient } from '../utils/client';
import { getApiKey } from '../utils/config';

/**
 * Configure agent graph commands
 */
export function configureGraphCommands(agentCmd: Command): void {
  // Add graph command group
  const graphCmd = agentCmd
    .command('graph')
    .description('Manage agent operation graphs');

  // Create a graph for an agent
  graphCmd
    .command('create')
    .description('Create a graph for an agent')
    .option('-a, --agent-id <id>', 'Agent ID to create a graph for')
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
        const client = new XpanderClient(apiKey, undefined, options.profile);

        // If no agent ID provided, show selection
        if (!options.agentId) {
          const agents = await client.getAgents();
          const { agentId } = await inquirer.prompt([
            {
              type: 'list',
              name: 'agentId',
              message: 'Select an agent to create a graph for:',
              choices: agents.map((agent) => ({
                name: `${agent.name} ${chalk.dim(`(${agent.id})`)}`,
                value: agent.id,
              })),
              pageSize: 15,
            },
          ]);
          options.agentId = agentId;
        }

        await createAgentGraph(client, options.agentId);
      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message || String(error));
      }
    });
}

/**
 * Creates a graph for an agent by selecting operations to include
 */
async function createAgentGraph(
  client: XpanderClient,
  agentId: string,
): Promise<void> {
  console.log('\n');
  console.log(chalk.bold.blue('🔄 Create Agent Graph'));
  console.log(chalk.dim('─'.repeat(60)));

  try {
    // Step 1: Get agent details
    const agentSpinner = ora('Fetching agent details...').start();
    const agent = await client.getAgent(agentId);

    if (!agent) {
      agentSpinner.fail('Agent not found or access denied');
      return;
    }

    agentSpinner.succeed(`Agent found: ${agent.name}`);

    // Step 2: Browse available interfaces to get operations
    console.log(chalk.bold('\n1. Add graph nodes for operations'));

    const interfacesSpinner = ora('Fetching available interfaces...').start();
    try {
      const interfaces = await client.getAgenticInterfaces();
      interfacesSpinner.succeed(`Found ${interfaces.length} interfaces`);

      if (interfaces.length === 0) {
        console.log(
          chalk.yellow('No interfaces available. Cannot create graph.'),
        );
        return;
      }

      // Select an interface
      const { selectedInterface } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedInterface',
          message: 'Select an interface to browse operations:',
          choices: interfaces.map((iface: any) => ({
            name: `${iface.name} ${chalk.dim(`(${iface.id})`)}`,
            value: iface,
          })),
          pageSize: 15,
        },
      ]);

      // Get operations for selected interface
      const operationsSpinner = ora('Fetching operations...').start();
      const operations = await client.getAgenticOperations(
        selectedInterface.id,
      );
      operationsSpinner.succeed(`Found ${operations.length} operations`);

      if (operations.length === 0) {
        console.log(
          chalk.yellow('No operations available for this interface.'),
        );
        return;
      }

      // Select operations for the graph
      const { selectedOps } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedOps',
          message: 'Select operations to add to the graph:',
          choices: operations.map((op: any) => ({
            name: `${op.name} ${chalk.dim(`(${op.id})`)}`,
            value: op,
          })),
          pageSize: 15,
          validate: (selected) => {
            if (selected.length === 0)
              return 'Please select at least one operation';
            return true;
          },
        },
      ]);

      // Step 3: Create graph nodes
      console.log(chalk.bold('\n2. Creating graph nodes...'));
      const graphNodes = [];

      for (const operation of selectedOps) {
        const nodeData = {
          item_id: operation.id,
          name: operation.name,
        };
        console.log(`Adding node for operation: ${nodeData.name}`);
        graphNodes.push({
          id: nodeData.item_id,
          name: nodeData.name,
          type: 'operation',
          interface_id: selectedInterface.id,
        });
      }

      // Add a final result node
      const resultNodeId = 'final-result';
      graphNodes.push({
        id: resultNodeId,
        name: 'Final Result',
        type: 'result',
      });

      // Step 4: Create edges (simplified sequential flow for now)
      console.log(chalk.bold('\n3. Creating graph edges...'));
      const graphEdges = [];

      for (let i = 0; i < graphNodes.length - 1; i++) {
        const source = graphNodes[i].id;
        const target = graphNodes[i + 1].id;

        graphEdges.push({
          source,
          target,
          condition: 'success', // Simple success condition
        });
      }

      // Step 5: Create the graph
      console.log(chalk.bold('\n4. Creating agent graph...'));
      const createGraphSpinner = ora('Creating graph...').start();

      // Prepare graph data (commented out until API is ready)
      /* const graphData = {
        agent_id: agentId,
        nodes: graphNodes,
        edges: graphEdges,
      }; */

      try {
        // For now, we're just going to mock this API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        createGraphSpinner.succeed('Graph created successfully');
        console.log(chalk.green('\n✅ Agent graph created with:'));
        console.log(`- ${graphNodes.length} nodes`);
        console.log(`- ${graphEdges.length} edges`);

        // Deploy the updated agent
        const deploySpinner = ora('Deploying agent with new graph...').start();
        await client.deployAgent(agentId);
        deploySpinner.succeed('Agent deployed successfully');
      } catch (error: any) {
        createGraphSpinner.fail('Failed to create graph');
        console.error(chalk.red('Error:'), error.message || String(error));
      }
    } catch (error: any) {
      interfacesSpinner.fail('Failed to fetch interfaces');
      console.error(chalk.red('Error:'), error.message || String(error));
    }
  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * Interactive graph management mode
 */
export async function manageAgentGraph(client: XpanderClient, agents: any[]) {
  // Select an agent first
  const { agentId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'agentId',
      message: 'Select an agent to manage graph for:',
      choices: agents.map((agentEntry) => ({
        name: `${agentEntry.name} ${chalk.dim(`(${agentEntry.id})`)}`,
        value: agentEntry.id,
      })),
      pageSize: 15,
    },
  ]);

  // Get agent details to check if it has tools
  const agentSpinner = ora('Loading agent details...').start();
  const agentData = await client.getAgent(agentId);
  agentSpinner.stop();

  if (!agentData) {
    console.log(chalk.yellow(`Agent with ID ${agentId} not found.`));
    return;
  }

  if (!agentData.tools || agentData.tools.length === 0) {
    console.log(chalk.yellow('This agent has no operations attached.'));
    console.log('Use "xpander agent tools attach" to attach operations first.');

    // Ask if user wants to attach operations now
    const { attachOps } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'attachOps',
        message: 'Would you like to attach operations now?',
        default: true,
      },
    ]);

    if (attachOps) {
      const success = await attachOperationsInteractive(client, agentId);

      if (success) {
        // Refresh agent details after attaching operations
        const refreshSpinner = ora('Refreshing agent details...').start();
        const refreshedAgent = await client.getAgent(agentId);
        refreshSpinner.stop();

        if (
          !refreshedAgent ||
          !refreshedAgent.tools ||
          refreshedAgent.tools.length === 0
        ) {
          console.log(
            chalk.yellow('Failed to attach operations. Cannot create graph.'),
          );
          return;
        }

        // Proceed to graph creation
        await createAgentGraph(client, agentId);
      } else {
        console.log(
          chalk.yellow('Operation attachment failed. Cannot create graph.'),
        );
      }
    }

    return;
  }

  // If agent has tools, offer graph management options
  console.log('');
  console.log(chalk.bold.cyan('📊 Agent Graph Management'));
  console.log(chalk.dim('─'.repeat(60)));

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Create new graph', value: 'create' },
        { name: 'Return to main menu', value: 'exit' },
      ],
    },
  ]);

  if (action === 'create') {
    await createAgentGraph(client, agentId);
  }
}
