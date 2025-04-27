import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { CommandType, GraphNode } from '../types';
import { attachOperationsInteractive } from './agent/tools';
import { XpanderClient } from '../utils/client';
import { getApiKey } from '../utils/config';

/**
 * Configure agent graph commands
 */
export function configureGraphCommands(agentCmd: Command): void {
  // Add graph command group
  const graphCmd = agentCmd
    .command(CommandType.Graph)
    .description('Manage agent operation graphs');

  // Create a graph for an agent
  graphCmd
    .command(CommandType.Create)
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

  // View an agent's graph structure
  graphCmd
    .command(CommandType.View)
    .description('View the graph structure of an agent')
    .option('-a, --agent-id <id>', 'Agent ID to view the graph for')
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
              message: 'Select an agent to view the graph for:',
              choices: agents.map((agent) => ({
                name: `${agent.name} ${chalk.dim(`(${agent.id})`)}`,
                value: agent.id,
              })),
              pageSize: 15,
            },
          ]);
          options.agentId = agentId;
        }

        await viewAgentGraph(client, options.agentId);
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

    // Step 2: Check if agent has operations attached
    if (!agent.tools || agent.tools.length === 0) {
      console.log(chalk.yellow('This agent has no operations attached.'));

      // Ask if user wants to attach operations first
      const { attachOps } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'attachOps',
          message: 'Would you like to attach operations first?',
          default: true,
        },
      ]);

      if (attachOps) {
        await attachOperationsInteractive(client, agentId);

        // Refresh agent details
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

        // Continue with updated agent
        agent.tools = refreshedAgent.tools;
      } else {
        return;
      }
    }

    // Step 3: Browse available interfaces to get operations
    console.log(chalk.bold('\n1. Add graph nodes for operations'));

    const interfacesSpinner = ora('Fetching available interfaces...').start();
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
    const operations = await client.getAgenticOperations(selectedInterface.id);
    operationsSpinner.succeed(`Found ${operations.length} operations`);

    if (operations.length === 0) {
      console.log(chalk.yellow('No operations available for this interface.'));
      return;
    }

    // Filter operations that are attached to the agent
    const attachedOperationIds = agent.tools.map((tool: any) => tool.id);
    const filteredOperations = operations.filter((op: any) =>
      attachedOperationIds.includes(op.id),
    );

    if (filteredOperations.length === 0) {
      console.log(
        chalk.yellow(
          'None of the operations from this interface are attached to the agent.',
        ),
      );
      return;
    }

    // Select operations for the graph
    const { selectedOps } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedOps',
        message: 'Select operations to add to the graph:',
        choices: filteredOperations.map((op: any) => ({
          name: `${op.name} ${chalk.dim(`(${op.id})`)}`,
          value: op,
          checked: true, // Pre-check all attached operations
        })),
        pageSize: 15,
        validate: (selected) => {
          if (selected.length === 0)
            return 'Please select at least one operation';
          return true;
        },
      },
    ]);

    // Step 4: Create graph nodes
    console.log(chalk.bold('\n2. Creating graph nodes...'));
    const graphNodes: GraphNode[] = [];

    for (const operation of selectedOps) {
      console.log(`Adding node for operation: ${operation.name}`);
      const nodeSpinner = ora('Creating node...').start();

      try {
        // Check if the operation has id_to_use_on_graph property
        const operationId = operation.id_to_use_on_graph || operation.id;
        console.log(chalk.dim(`Using operation ID: ${operationId}`));

        const node = await client.createGraphNode(
          agentId,
          operationId,
          operation.name,
        );

        graphNodes.push(node);
        nodeSpinner.succeed(`Created node: ${node.name}`);
      } catch (error) {
        nodeSpinner.fail(`Failed to create node for ${operation.name}`);
        console.error(chalk.red('Error:'), error);
      }
    }

    if (graphNodes.length < 2) {
      console.log(
        chalk.yellow('At least two nodes are required to create a graph.'),
      );
      return;
    }

    // Step 5: Create connections between nodes
    console.log(chalk.bold('\n3. Setting up node connections...'));

    // Default sequential flow
    const { flowType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'flowType',
        message: 'How should operations be connected?',
        choices: [
          { name: 'Sequential (one after another)', value: 'sequential' },
          { name: 'Custom connections', value: 'custom' },
        ],
      },
    ]);

    if (flowType === 'sequential') {
      // Create sequential connections
      for (let i = 0; i < graphNodes.length - 1; i++) {
        const source = graphNodes[i];
        const target = graphNodes[i + 1];

        console.log(`Connecting: ${source.name} → ${target.name}`);
        const edgeSpinner = ora('Creating connection...').start();

        try {
          await client.connectGraphNodes(agentId, source.id, target.id);
          edgeSpinner.succeed('Connection created');
        } catch (error) {
          edgeSpinner.fail('Failed to create connection');
          console.error(chalk.red('Error:'), error);
        }
      }
    } else {
      // Custom connections - for each node, ask which nodes it should connect to
      for (let i = 0; i < graphNodes.length; i++) {
        const source = graphNodes[i];
        const remainingNodes = graphNodes.filter((n) => n.id !== source.id);

        if (remainingNodes.length === 0) continue;

        console.log(`\nSet up connections for: ${chalk.cyan(source.name)}`);

        const { targetNodes } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'targetNodes',
            message: `Select nodes that ${source.name} should connect to:`,
            choices: remainingNodes.map((node) => ({
              name: node.name,
              value: node,
              checked:
                i + 1 < graphNodes.length && node.id === graphNodes[i + 1].id, // Default to next node
            })),
          },
        ]);

        for (const target of targetNodes) {
          console.log(`Connecting: ${source.name} → ${target.name}`);
          const edgeSpinner = ora('Creating connection...').start();

          try {
            await client.connectGraphNodes(agentId, source.id, target.id);
            edgeSpinner.succeed('Connection created');
          } catch (error) {
            edgeSpinner.fail('Failed to create connection');
            console.error(chalk.red('Error:'), error);
          }
        }
      }
    }

    // Step 6: Deploy the agent
    console.log(chalk.bold('\n4. Deploying agent with new graph...'));
    const deploySpinner = ora('Deploying agent...').start();

    try {
      await client.deployAgent(agentId);
      deploySpinner.succeed('Agent deployed successfully');
      console.log(chalk.green('\n✅ Agent graph created and deployed'));
    } catch (error) {
      deploySpinner.fail('Failed to deploy agent');
      console.error(chalk.red('Error:'), error);
    }
  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}

/**
 * View the graph structure of an agent
 */
async function viewAgentGraph(
  client: XpanderClient,
  agentId: string,
): Promise<void> {
  console.log('\n');
  console.log(chalk.bold.blue('📊 Agent Graph Structure'));
  console.log(chalk.dim('─'.repeat(60)));

  try {
    // Get agent details
    const agentSpinner = ora('Fetching agent details...').start();
    const agent = await client.getAgent(agentId);

    if (!agent) {
      agentSpinner.fail('Agent not found or access denied');
      return;
    }

    agentSpinner.succeed(`Agent: ${agent.name}`);

    // Get graph structure
    const graphSpinner = ora('Retrieving graph structure...').start();
    const graph = await client.getAgentGraph(agentId);

    if (!graph || (graph.nodes.length === 0 && graph.edges.length === 0)) {
      graphSpinner.fail('No graph structure found for this agent');
      console.log(
        chalk.yellow('Use "xpander agent graph create" to create a graph.'),
      );
      return;
    }

    graphSpinner.succeed(
      `Found graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges`,
    );

    // Display nodes
    console.log('\n');
    console.log(chalk.cyan('Graph Nodes:'));
    graph.nodes.forEach((node, index) => {
      console.log(
        `${index + 1}. ${chalk.bold(node.name)} ${chalk.dim(`(${node.id})`)}`,
      );
    });

    // Display edges
    if (graph.edges.length > 0) {
      console.log('\n');
      console.log(chalk.cyan('Graph Connections:'));

      // Create a node map for easier lookup
      const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

      graph.edges.forEach((edge, index) => {
        const sourceName = nodeMap.get(edge.source)?.name || edge.source;
        const targetName = nodeMap.get(edge.target)?.name || edge.target;

        console.log(
          `${index + 1}. ${chalk.bold(sourceName)} → ${chalk.bold(targetName)} (${edge.condition})`,
        );
      });
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

        // Proceed to graph management
        await graphManagementMenu(client, agentId);
      } else {
        console.log(
          chalk.yellow('Operation attachment failed. Cannot create graph.'),
        );
      }
    }

    return;
  }

  // If agent has tools, offer graph management options
  await graphManagementMenu(client, agentId);
}

/**
 * Display graph management menu
 */
async function graphManagementMenu(
  client: XpanderClient,
  agentId: string,
): Promise<void> {
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
        { name: 'View current graph', value: 'view' },
        { name: 'Return to main menu', value: 'exit' },
      ],
    },
  ]);

  if (action === 'create') {
    await createAgentGraph(client, agentId);
  } else if (action === 'view') {
    await viewAgentGraph(client, agentId);
  }
}
