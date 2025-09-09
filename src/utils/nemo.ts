import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import ora from 'ora';
import { Agent } from '../types';
import { XpanderClient } from './client';
import { fileExists } from './custom-agents';
import { NeMoConfig } from '../types/nemo';

const nemoConfigFileName = 'nemo_config.yml';

export const createNeMoConfigFile = async (agent: Agent, dir: string) => {
  const configPath = path.join(dir, nemoConfigFileName);
  const config: NeMoConfig = {
    general: {
      use_uvloop: true,
      telemetry: {
        logging: { console: { _type: 'console', level: 'CRITICAL' } },
      },
    },
    llms: {
      [agent.model_provider]: {
        _type: agent.model_provider,
        model_name: agent.model_name,
        temperature: 0.0,
      },
    },
    workflow: {
      _type: 'xpander_nemo_agent',
      llm_name: agent.model_provider,
      verbose: false,
      retry_parsing_errors: true,
      max_retries: 3,
    },
  };

  await fs.writeFile(configPath, yaml.dump(config));
};

export const syncNeMoConfigFile = async (
  agentId: string,
  client: XpanderClient,
  dir: string,
  spinner: ora.Ora,
) => {
  const configPath = path.join(dir, nemoConfigFileName);

  // read existing file
  if (await fileExists(configPath)) {
    try {
      // Get agent Details
      spinner.text = `Retrieving agent "${agentId}"...`;
      const agent = await client.getAgent(agentId);
      if (!agent) {
        return;
      }
      const config = yaml.load(
        (await fs.readFile(configPath)).toString(),
      ) as unknown as NeMoConfig;

      if (config && !!config?.llms) {
        const llms = Object.values(config.llms);

        if (!!llms && llms.length !== 0) {
          const firstLLM = llms[0]; // take first llm only
          // sync if needed
          if (
            firstLLM._type !== agent.model_provider ||
            firstLLM.model_name !== agent.model_name
          ) {
            spinner.text = `Syncing agent "${agent.name}" LLM configuration from NeMo config`;
            await client.updateAgent(
              agentId,
              {
                model_provider: firstLLM._type,
                model_name: firstLLM.model_name,
              },
              true,
            );
            await client.deployAgent(agentId, true);
          }
        }
      }
    } catch (err: any) {
      console.error(
        `Failed to sync NeMo LLM configuration ${nemoConfigFileName} - ${err.message}`,
      );
    }
  }
};
