import chalk from 'chalk';
import inquirer from 'inquirer';
import { XpanderClient } from './client';
import { getCachedAgents, setCachedAgents } from './config';
import { getXpanderConfigFromEnvFile } from './custom_agents_utils/generic';

/**
 * Get agents with caching support
 */
async function getAgentsWithCache(client: XpanderClient): Promise<any[]> {
  // Try to get from cache first
  const cachedAgents = getCachedAgents();
  if (cachedAgents) {
    return cachedAgents;
  }

  // Cache miss - fetch from API
  const agentsResponse = await client.getAgents();
  const agents = agentsResponse || [];

  // Cache the result
  setCachedAgents(agents);

  return agents;
}

/**
 * Get agents with cache, but fallback to fresh data if agent ID is not found
 */
async function getAgentsWithFallback(
  client: XpanderClient,
  searchAgentId?: string,
): Promise<any[]> {
  // Always try cached agents first
  let agents = await getAgentsWithCache(client);

  // Only refresh cache if we're looking for a specific agent and it's not found
  if (
    searchAgentId &&
    agents.length > 0 && // Only check if we have cached data
    !agents.find(
      (agent: any) =>
        agent.id === searchAgentId ||
        agent.name.toLowerCase() === searchAgentId.toLowerCase(),
    )
  ) {
    // Agent not found in cache - fetch fresh data
    const agentsResponse = await client.getAgents();
    agents = agentsResponse || [];

    // Update cache with fresh data
    setCachedAgents(agents);
  }

  return agents;
}

export async function resolveAgentId(
  client: XpanderClient,
  agentNameOrId: string,
  silent: boolean = false,
): Promise<string | null> {
  try {
    const agents = await getAgentsWithFallback(client, agentNameOrId);

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
      if (!silent) {
        console.log(
          chalk.green('✔') +
            ' ' +
            chalk.hex('#743CFF')(
              `Using agent: ${agentsByName[0].name} (${agentsByName[0].id})`,
            ),
        );
      }
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
  silent: boolean = false,
  workingDirectory?: string,
): Promise<string | null> {
  // If agent ID is provided, resolve it (could be name or ID)
  if (providedAgentId) {
    return resolveAgentId(client, providedAgentId, silent);
  }

  // Try to get agent ID from .env file
  try {
    const config = await getXpanderConfigFromEnvFile(
      workingDirectory || process.cwd(),
    );
    if (config?.agent_id) {
      return config.agent_id;
    }
  } catch (error) {
    // No .env file or no agent_id in it
  }

  // Show interactive selection
  try {
    const agents = await getAgentsWithCache(client);

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
