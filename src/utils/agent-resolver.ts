import chalk from 'chalk';
import inquirer from 'inquirer';
import { XpanderClient } from './client';
import { getXpanderConfigFromEnvFile } from './custom_agents_utils/generic';

export async function resolveAgentId(
  client: XpanderClient,
  agentNameOrId: string,
): Promise<string | null> {
  try {
    const agentsResponse = await client.getAgents();
    const agents = agentsResponse || [];

    // First try to find by exact ID
    const agentById = agents.find((agent: any) => agent.id === agentNameOrId);
    if (agentById) {
      return agentNameOrId; // It's already an ID
    }

    // Try to find by name
    const agentsByName = agents.filter(
      (agent: any) => agent.name.toLowerCase() === agentNameOrId.toLowerCase(),
    );

    if (agentsByName.length === 0) {
      console.error(
        chalk.red(`No agent found with name or ID: "${agentNameOrId}"`),
      );
      return null;
    }

    if (agentsByName.length === 1) {
      console.log(
        chalk.hex('#743CFF')(
          `Using agent: ${agentsByName[0].name} (${agentsByName[0].id})`,
        ),
      );
      return agentsByName[0].id;
    }

    // Multiple agents with same name - show selection
    console.log(
      chalk.yellow(`Multiple agents found with name "${agentNameOrId}":`),
    );

    // Sort duplicates by creation date (newest first)
    const sortedDuplicates = [...agentsByName].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const { selectedAgentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgentId',
        message: 'Select which agent you meant:',
        choices: sortedDuplicates.map((agent: any) => ({
          name: `${agent.name} ${chalk.dim(`(${agent.id})`)}`,
          value: agent.id,
        })),
      },
    ]);

    return selectedAgentId;
  } catch (error: any) {
    console.error(
      chalk.red('Error fetching agents:'),
      error.message || String(error),
    );
    return null;
  }
}

export async function getAgentIdFromEnvOrSelection(
  client: XpanderClient,
  providedAgentId?: string,
): Promise<string | null> {
  // If agent ID is provided, resolve it (could be name or ID)
  if (providedAgentId) {
    return resolveAgentId(client, providedAgentId);
  }

  // Try to get agent ID from .env file
  try {
    const config = await getXpanderConfigFromEnvFile(process.cwd());
    if (config?.agent_id) {
      return config.agent_id;
    }
  } catch (error) {
    // No .env file or no agent_id in it
  }

  // Show interactive selection
  try {
    const agentsResponse = await client.getAgents();
    const agents = agentsResponse || [];

    if (agents.length === 0) {
      console.log(
        chalk.yellow(
          'No agents found. Create one first with: xpander agent new',
        ),
      );
      return null;
    }

    // Sort agents by creation date (newest first)
    const sortedAgents = [...agents].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const { selectedAgentId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedAgentId',
        message: 'Select an agent:',
        choices: sortedAgents.map((agent: any) => ({
          name: `${agent.name} ${chalk.dim(`(${agent.id})`)}`,
          value: agent.id,
        })),
      },
    ]);

    return selectedAgentId;
  } catch (error: any) {
    console.error(
      chalk.red('Error fetching agents:'),
      error.message || String(error),
    );
    return null;
  }
}
