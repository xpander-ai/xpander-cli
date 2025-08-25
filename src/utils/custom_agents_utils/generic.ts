import { promises as fs } from 'fs';
import * as path from 'path';
import * as fssync from 'fs';
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
 * Safely merge new environment variables into an existing .env file
 * with user confirmation to prevent data loss
 */
export async function mergeEnvFile(
  envPath: string,
  newVars: Record<string, string>,
  examplePath?: string,
  isNonInteractive: boolean = false,
): Promise<void> {
  const existingEnvExists = fssync.existsSync(envPath);
  let existingVars: Record<string, string> = {};
  let existingLines: string[] = [];

  // Read existing .env if it exists
  if (existingEnvExists) {
    const existingContent = await fs.readFile(envPath, 'utf-8');
    existingLines = existingContent.split('\n');

    existingVars = Object.fromEntries(
      existingContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const [key, ...rest] = line.split('=');
          const value = rest.join('=').trim();
          return [key.trim(), value];
        }),
    );
  }

  // Check for conflicts (existing vars that would be overwritten)
  const conflicts = Object.keys(newVars).filter(
    (key) => existingVars[key] && existingVars[key] !== newVars[key],
  );

  let shouldOverride = true;
  if (conflicts.length > 0 && !isNonInteractive) {
    console.log(
      chalk.yellow('\n⚠️  Conflicting environment variables detected:'),
    );
    conflicts.forEach((key) => {
      console.log(
        `  ${key}: ${chalk.red(existingVars[key])} → ${chalk.green(newVars[key])}`,
      );
    });

    const { override } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'override',
        message: 'Do you want to override the existing values?',
        default: false,
      },
    ]);
    shouldOverride = override;
  } else if (conflicts.length > 0 && isNonInteractive) {
    // In non-interactive mode, don't override conflicting values
    shouldOverride = false;
  }

  // Build the final .env content
  let finalLines: string[] = [];

  if (existingEnvExists && shouldOverride) {
    // Start with existing lines and update conflicting ones
    finalLines = existingLines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) {
        return line; // Keep comments and empty lines as-is
      }

      const [key] = line.split('=', 1);
      const cleanKey = key.trim();
      if (newVars[cleanKey]) {
        return `${cleanKey}=${newVars[cleanKey]}`;
      }
      return line;
    });

    // Add any new variables that don't exist
    Object.keys(newVars).forEach((key) => {
      if (!existingVars[key]) {
        finalLines.push(`${key}=${newVars[key]}`);
      }
    });
  } else if (existingEnvExists && !shouldOverride) {
    // Keep existing lines and only add non-conflicting new variables
    finalLines = [...existingLines];
    Object.keys(newVars).forEach((key) => {
      if (!existingVars[key]) {
        finalLines.push(`${key}=${newVars[key]}`);
      }
    });
  } else {
    // No existing .env file, start with .env.example if available
    if (examplePath && fssync.existsSync(examplePath)) {
      const exampleContent = await fs.readFile(examplePath, 'utf-8');
      finalLines = exampleContent.split('\n').map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) {
          return line; // Keep comments and empty lines as-is
        }

        const [key] = line.split('=', 1);
        const cleanKey = key.trim();
        if (newVars[cleanKey]) {
          return `${cleanKey}=${newVars[cleanKey]}`;
        }
        return line;
      });

      // Add any new variables that don't exist in the example
      Object.keys(newVars).forEach((key) => {
        if (
          !finalLines.some((line) =>
            line.trim().startsWith(`${key}=`),
          )
        ) {
          finalLines.push(`${key}=${newVars[key]}`);
        }
      });
    } else {
      // No example file, just create from new vars
      finalLines = Object.entries(newVars).map(
        ([key, value]) => `${key}=${value}`,
      );
    }
  }

  // Write the final content
  await fs.writeFile(envPath, finalLines.join('\n'));

  if (!isNonInteractive) {
    console.log(chalk.green('✓ Environment file updated successfully'));
  }
}
