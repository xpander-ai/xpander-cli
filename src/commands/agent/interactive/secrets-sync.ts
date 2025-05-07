import fs from 'fs/promises';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { XpanderClient } from '../../../utils/client';
import { fileExists } from '../../../utils/custom-agents';

const BASE_URL = 'https://deployment-manager.xpander.ai';
const BASE_URL_STG = 'https://deployment-manager.stg.xpander.ai';

const parseKeyValue = (input: string): Record<string, string | number> => {
  const lines = input.trim().split('\n');
  const result: Record<string, any> = {};

  for (const line of lines) {
    const match = line.match(/^(\w+)\s*=\s*("?)(.+?)\2$/);
    if (match) {
      const [, key, , value] = match;
      const numeric = Number(value);
      result[key] = isNaN(numeric) ? value : numeric;
    }
  }

  return result;
};

/**
 * sync .env agent with interactive prompts
 */
export async function syncSecrets(client: XpanderClient) {
  console.log('\n');
  console.log(chalk.bold.blue('✨ Syncing secrets'));
  console.log(chalk.dim('─'.repeat(60)));

  const syncSpinner = ora(`Syncing`).start();
  try {
    const currentDirectory = process.cwd();

    // validations
    const dotEnvExists = await fileExists(`${currentDirectory}/.env`);
    if (!dotEnvExists) {
      syncSpinner.fail('.env file not found');
      return;
    }
    const dotEnvContent = (
      await fs.readFile(`${currentDirectory}/.env`)
    ).toString();

    if (dotEnvContent.length === 0) {
      syncSpinner.fail('.env file is empty');
      return;
    }

    const secerts = parseKeyValue(dotEnvContent);

    if (Object.keys(secerts).length === 0) {
      syncSpinner.fail('no secrets found');
      return;
    }

    // sync
    const apiURL = client.isStg ? BASE_URL_STG : BASE_URL;
    const endpoint = `${apiURL}/${client.orgId}/registry/secrets_sync`;

    await axios.patch(endpoint, secerts, {
      headers: { 'x-api-key': client.apiKey },
    });
    syncSpinner.succeed(`Secrets synced`);
  } catch (error: any) {
    syncSpinner.fail('Failed to sync secrets');
    console.error(chalk.red('Error:'), error.message || String(error));
  }
}
