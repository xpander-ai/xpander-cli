import { promises as fs } from 'fs';
import * as path from 'path';
import { XPanderConfig } from '../../types';

export const getXpanderConfigFromEnvFile = async (
  dir: string,
): Promise<XPanderConfig> => {
  const envPath = path.join(dir, '.env');
  const envContent = await fs.readFile(envPath, 'utf-8');

  const envVars = Object.fromEntries(
    envContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=');
        const value = rest
          .join('=')
          .trim()
          .replace(/^['"]|['"]$/g, '');
        return [key.trim(), value];
      }),
  );

  const apiKey = envVars.XPANDER_API_KEY;
  const orgId = envVars.XPANDER_ORGANIZATION_ID;
  const agentId = envVars.XPANDER_AGENT_ID;

  const missingVars = [];
  if (!apiKey) missingVars.push('XPANDER_API_KEY');
  if (!orgId) missingVars.push('XPANDER_ORGANIZATION_ID');
  if (!agentId) missingVars.push('XPANDER_AGENT_ID');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingVars.join(', ')}`,
    );
  }

  return {
    api_key: apiKey,
    organization_id: orgId,
    agent_id: agentId,
  };
};
