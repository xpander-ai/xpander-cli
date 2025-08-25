import { promises as fs } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
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

/**
 * Parse .env file into key-value pairs, preserving comments and structure
 */
function parseEnvFile(content: string): {
  lines: string[];
  vars: Record<string, string>;
} {
  const lines = content.split('\n');
  const vars: Record<string, string> = {};

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return; // Skip comments and empty lines
    }

    const [key, ...rest] = trimmed.split('=');
    const value = rest
      .join('=')
      .trim()
      .replace(/^['"]|['"]$/g, '');
    vars[key.trim()] = value;
  });

  return { lines, vars };
}

/**
 * Safely merge .env file with new values, asking for user confirmation if file exists
 */
export async function mergeEnvFile(
  envPath: string,
  newVars: Record<string, string>,
  examplePath?: string,
  isNonInteractive: boolean = false,
): Promise<void> {
  const envExists = await fs
    .access(envPath)
    .then(() => true)
    .catch(() => false);

  // If .env doesn't exist, create it from template or new vars
  if (!envExists) {
    let baseLines: string[] = [];

    // Try to use .env.example as base
    if (examplePath) {
      const exampleExists = await fs
        .access(examplePath)
        .then(() => true)
        .catch(() => false);
      if (exampleExists) {
        const exampleContent = await fs.readFile(examplePath, 'utf-8');
        baseLines = exampleContent.split('\n');
      }
    }

    const mergedLines = mergeEnvLines(baseLines, {}, newVars);
    await fs.writeFile(envPath, mergedLines.join('\n'));
    return;
  }

  // .env exists - read current content
  const existingContent = await fs.readFile(envPath, 'utf-8');
  const { lines: existingLines, vars: existingVars } =
    parseEnvFile(existingContent);

  // Check if any values would be overwritten
  const conflictingKeys = Object.keys(newVars).filter(
    (key) =>
      existingVars.hasOwnProperty(key) && existingVars[key] !== newVars[key],
  );

  if (conflictingKeys.length > 0 && !isNonInteractive) {
    console.log(
      chalk.yellow('⚠️  Existing .env file found with conflicting values:'),
    );
    conflictingKeys.forEach((key) => {
      console.log(
        chalk.dim(`  ${key}: "${existingVars[key]}" → "${newVars[key]}"`),
      );
    });
    console.log('');

    const { shouldMerge } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldMerge',
        message:
          'Do you want to merge the cloud settings with your existing .env file?',
        default: true,
      },
    ]);

    if (!shouldMerge) {
      console.log(chalk.blue('ℹ️  Keeping existing .env file unchanged'));
      return;
    }
  }

  // Merge the values
  const mergedLines = mergeEnvLines(existingLines, existingVars, newVars);
  await fs.writeFile(envPath, mergedLines.join('\n'));

  if (conflictingKeys.length > 0) {
    console.log(
      chalk.green('✅ Successfully merged .env file with cloud settings'),
    );
  }
}

/**
 * Merge new variables into existing .env lines, preserving structure
 */
function mergeEnvLines(
  existingLines: string[],
  _existingVars: Record<string, string>,
  newVars: Record<string, string>,
): string[] {
  const keysToAdd = Object.keys(newVars);
  const processedKeys = new Set<string>();

  // Process existing lines, updating values where needed
  const mergedLines = existingLines.map((line) => {
    const trimmed = line.trim();

    // Preserve comments and empty lines
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return line;
    }

    const [key] = trimmed.split('=', 1);
    const keyName = key.trim();

    if (keysToAdd.includes(keyName)) {
      processedKeys.add(keyName);
      return `${keyName}=${newVars[keyName]}`;
    }

    return line;
  });

  // Add any new keys that weren't in the existing file
  keysToAdd.forEach((key) => {
    if (!processedKeys.has(key)) {
      mergedLines.push(`${key}=${newVars[key]}`);
    }
  });

  return mergedLines;
}
