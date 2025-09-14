import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { Agent } from '../types';
import { XpanderClient } from './client';
import { fileExists } from './custom-agents';
import { getXpanderConfigFromEnvFile } from './custom_agents_utils/generic';
import { NeMoConfig } from '../types/nemo';

const nemoConfigFileName = 'nemo_config.yml';

/**
 * Validates that the current directory has the required files for NeMo sync
 */
export async function validateNeMoSyncEnvironment(dir: string): Promise<{
  valid: boolean;
  agentId?: string;
  error?: string;
}> {
  // Check for .env file
  const envPath = path.join(dir, '.env');
  if (!(await fileExists(envPath))) {
    return {
      valid: false,
      error:
        'No .env file found in current directory. Make sure you are in an initialized agent directory.',
    };
  }

  // Check for nemo_config.yml file
  const nemoConfigPath = path.join(dir, nemoConfigFileName);
  if (!(await fileExists(nemoConfigPath))) {
    return {
      valid: false,
      error:
        'No nemo_config.yml file found. This command requires a NeMo-enabled agent.',
    };
  }

  // Extract agent ID from .env
  try {
    const config = await getXpanderConfigFromEnvFile(dir);
    return {
      valid: true,
      agentId: config.agent_id,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Failed to read agent configuration: ${error.message}`,
    };
  }
}

/**
 * Validates that the agent supports NeMo operations
 */
export async function validateAgentNeMoSupport(
  client: XpanderClient,
  agentId: string,
): Promise<{
  valid: boolean;
  agent?: Agent;
  error?: string;
}> {
  try {
    const agent = await client.getAgent(agentId);
    if (!agent) {
      return {
        valid: false,
        error: `Agent with ID ${agentId} not found.`,
      };
    }

    if (!agent.using_nemo) {
      return {
        valid: false,
        error: `Agent "${agent.name}" is not configured to use NeMo. Enable NeMo support for this agent first.`,
      };
    }

    return {
      valid: true,
      agent,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Failed to fetch agent details: ${error.message}`,
    };
  }
}

/**
 * Reads and parses the NeMo config file
 */
export async function readNeMoConfig(dir: string): Promise<NeMoConfig> {
  const configPath = path.join(dir, nemoConfigFileName);
  const configContent = await fs.readFile(configPath, 'utf-8');
  return yaml.load(configContent) as NeMoConfig;
}

/**
 * Writes the NeMo config file
 */
export async function writeNeMoConfig(
  dir: string,
  config: NeMoConfig,
): Promise<void> {
  const configPath = path.join(dir, nemoConfigFileName);
  await fs.writeFile(configPath, yaml.dump(config));
}

/**
 * Updates the NeMo config with new LLM settings (affects only the first LLM)
 * Uses the agent's model_provider as the new LLM key
 */
export async function updateNeMoConfigWithAgent(
  dir: string,
  agent: Agent,
): Promise<void> {
  const config = await readNeMoConfig(dir);

  // Get the first LLM and its configuration
  const llmKeys = Object.keys(config.llms);
  if (llmKeys.length === 0) {
    throw new Error('No LLM configuration found in nemo_config.yml');
  }

  const firstLlmKey = llmKeys[0];
  const firstLlmConfig = config.llms[firstLlmKey];

  // Remove the old LLM key
  delete config.llms[firstLlmKey];

  // Create new LLM entry with model_provider as the key
  const newLlmKey = agent.model_provider;
  config.llms[newLlmKey] = {
    ...firstLlmConfig,
    _type: agent.model_provider,
    model_name: agent.model_name,
  };

  // Update workflow to reference the new LLM key
  config.workflow.llm_name = newLlmKey;

  await writeNeMoConfig(dir, config);
}

/**
 * Extracts LLM configuration from NeMo config (first LLM only)
 */
export async function extractLLMConfigFromNeMo(dir: string): Promise<{
  modelProvider: string;
  modelName: string;
}> {
  const config = await readNeMoConfig(dir);

  const llms = Object.values(config.llms);
  if (!llms || llms.length === 0) {
    throw new Error('No LLM configuration found in nemo_config.yml');
  }

  const firstLLM = llms[0]; // Take first LLM only
  return {
    modelProvider: firstLLM._type,
    modelName: firstLLM.model_name,
  };
}
