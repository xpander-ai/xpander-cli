import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getXpanderConfigFromEnvFile } from './custom_agents_utils/generic';

// Config directory and files in user's home directory
const CONFIG_DIR = path.join(os.homedir(), '.xpander');
const CREDS_FILE = path.join(CONFIG_DIR, 'credentials');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

// Default profile name
const DEFAULT_PROFILE = 'default';

// Default format
const DEFAULT_FORMAT = 'table';

// Special section for default profile in credentials file
const DEFAULT_SECTION = 'default';

/**
 * Ensures the config directory exists
 */
function ensureConfigDirExists(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Parse a credentials file in AWS-style format
 * [profile-name]
 * key=value
 */
function parseCredsFile(
  filePath: string,
): Record<string, Record<string, string>> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const profiles: Record<string, Record<string, string>> = {};

  let currentProfile: string | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Profile header
    const profileMatch = trimmedLine.match(/^\[([\w-]+)\]$/);
    if (profileMatch) {
      currentProfile = profileMatch[1];
      if (!profiles[currentProfile]) {
        profiles[currentProfile] = {};
      }
      continue;
    }

    // Key-value pair
    if (currentProfile) {
      const keyValueMatch = trimmedLine.match(/^([\w_]+)=(.*)$/);
      if (keyValueMatch) {
        const [, key, value] = keyValueMatch;
        profiles[currentProfile][key] = value;
      }
    }
  }

  return profiles;
}

/**
 * Save credentials in AWS-style format
 */
function saveCredsFile(
  filePath: string,
  profiles: Record<string, Record<string, string>>,
): void {
  let content = '';

  for (const [profileName, profileData] of Object.entries(profiles)) {
    content += `[${profileName}]\n`;

    for (const [key, value] of Object.entries(profileData)) {
      content += `${key}=${value}\n`;
    }

    content += '\n';
  }

  fs.writeFileSync(filePath, content);
}

/**
 * Read a single line key=value config file
 */
function readConfigFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const config: Record<string, string> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Key-value pair
    const keyValueMatch = trimmedLine.match(/^([\w_]+)=(.*)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      config[key] = value;
    }
  }

  return config;
}

/**
 * Save a single line key=value config file
 */
function saveConfigFile(
  filePath: string,
  config: Record<string, string>,
): void {
  let content = '';

  for (const [key, value] of Object.entries(config)) {
    content += `${key}=${value}\n`;
  }

  fs.writeFileSync(filePath, content);
}

/**
 * Get the current active profile name
 */
export function getCurrentProfile(): string {
  ensureConfigDirExists();

  // First check if we have an environment variable set
  if (process.env.XPANDER_CURRENT_PROFILE) {
    return process.env.XPANDER_CURRENT_PROFILE;
  }

  // Check if there's a default profile set in the credentials file
  const creds = parseCredsFile(CREDS_FILE);
  if (creds[DEFAULT_SECTION] && creds[DEFAULT_SECTION].default_profile) {
    return creds[DEFAULT_SECTION].default_profile;
  }

  // Fall back to the config file
  const config = readConfigFile(CONFIG_FILE);
  return config.current_profile || DEFAULT_PROFILE;
}

/**
 * Set the current active profile
 */
export function setCurrentProfile(profile: string): void {
  ensureConfigDirExists();
  const config = readConfigFile(CONFIG_FILE);
  config.current_profile = profile;
  saveConfigFile(CONFIG_FILE, config);
}

/**
 * Get the API key for a profile
 * Priority: CLI flag > Profile configuration > OS environment variables
 */
export function getApiKey(profile?: string): string {
  // Check CLI-provided API key first (highest priority)
  if (process.env.XPANDER_CLI_API_KEY) {
    return process.env.XPANDER_CLI_API_KEY;
  }

  const profileName = profile || getCurrentProfile();
  ensureConfigDirExists();

  // If a specific profile is requested, use profile configuration first
  if (profile) {
    const creds = parseCredsFile(CREDS_FILE);
    if (creds[profileName] && creds[profileName].xpander_api_key) {
      return creds[profileName].xpander_api_key;
    }
    return '';
  }

  // For default profile, check profile config first, then OS environment variables
  const creds = parseCredsFile(CREDS_FILE);
  if (creds[profileName] && creds[profileName].xpander_api_key) {
    return creds[profileName].xpander_api_key;
  }

  // Fall back to OS environment variables only if no profile config exists
  if (process.env.xpander_api_key) {
    return process.env.xpander_api_key;
  }
  if (process.env.XPANDER_API_KEY) {
    return process.env.XPANDER_API_KEY;
  }

  return '';
}

/**
 * Get the API key for a profile (async version that can read from .env files)
 * Priority: CLI flag > Profile configuration > Local .env file > OS environment variables
 */
export async function getApiKeyAsync(profile?: string): Promise<string> {
  // Check CLI-provided API key first (highest priority)
  if (process.env.XPANDER_CLI_API_KEY) {
    return process.env.XPANDER_CLI_API_KEY;
  }

  const profileName = profile || getCurrentProfile();
  ensureConfigDirExists();

  // If a specific profile is requested, use profile configuration first
  if (profile) {
    const creds = parseCredsFile(CREDS_FILE);
    if (creds[profileName] && creds[profileName].xpander_api_key) {
      return creds[profileName].xpander_api_key;
    }
    return '';
  }

  // For default profile, check profile config first
  const creds = parseCredsFile(CREDS_FILE);
  if (creds[profileName] && creds[profileName].xpander_api_key) {
    return creds[profileName].xpander_api_key;
  }

  // Check local .env file
  try {
    const config = await getXpanderConfigFromEnvFile(process.cwd());
    if (config.api_key) {
      return config.api_key;
    }
  } catch (error) {
    // No .env file or no api_key in it, continue to OS environment variables
  }

  // Fall back to OS environment variables only if no profile config or .env exists
  if (process.env.xpander_api_key) {
    return process.env.xpander_api_key;
  }
  if (process.env.XPANDER_API_KEY) {
    return process.env.XPANDER_API_KEY;
  }

  return '';
}

/**
 * Set the API key for a profile
 */
export function setApiKey(apiKey: string, profile?: string): void {
  const profileName = profile || getCurrentProfile();
  ensureConfigDirExists();

  const creds = parseCredsFile(CREDS_FILE);
  if (!creds[profileName]) {
    creds[profileName] = {};
  }

  creds[profileName].xpander_api_key = apiKey;
  saveCredsFile(CREDS_FILE, creds);
}

/**
 * Get the organization ID for a profile
 * Profile configuration takes precedence, falls back to OS environment variables
 */
export function getOrganizationId(profile?: string): string {
  const profileName = profile || getCurrentProfile();
  ensureConfigDirExists();

  // If a specific profile is requested, use profile configuration first
  if (profile) {
    const creds = parseCredsFile(CREDS_FILE);
    if (creds[profileName] && creds[profileName].xpander_organization_id) {
      return creds[profileName].xpander_organization_id;
    }
    return '';
  }

  // For default profile, check profile config first, then OS environment variables
  const creds = parseCredsFile(CREDS_FILE);
  if (creds[profileName] && creds[profileName].xpander_organization_id) {
    return creds[profileName].xpander_organization_id;
  }

  // Fall back to OS environment variables only if no profile config exists
  if (process.env.xpander_organization_id) {
    return process.env.xpander_organization_id;
  }
  if (process.env.XPANDER_ORGANIZATION_ID) {
    return process.env.XPANDER_ORGANIZATION_ID;
  }

  return '';
}

/**
 * Set the organization ID for a profile
 */
export function setOrganizationId(orgId: string, profile?: string): void {
  const profileName = profile || getCurrentProfile();
  ensureConfigDirExists();

  const creds = parseCredsFile(CREDS_FILE);
  if (!creds[profileName]) {
    creds[profileName] = {};
  }

  creds[profileName].xpander_organization_id = orgId;
  saveCredsFile(CREDS_FILE, creds);
}

/**
 * Get the preferred output format
 */
export function getPreferredFormat(): string {
  ensureConfigDirExists();
  const config = readConfigFile(CONFIG_FILE);
  return config.output_format || DEFAULT_FORMAT;
}

/**
 * Set the preferred output format
 */
export function setPreferredFormat(format: string): void {
  ensureConfigDirExists();
  const config = readConfigFile(CONFIG_FILE);
  config.output_format = format;
  saveConfigFile(CONFIG_FILE, config);
}

/**
 * List all profiles
 */
export function listProfiles(): string[] {
  ensureConfigDirExists();
  const creds = parseCredsFile(CREDS_FILE);
  return Object.keys(creds);
}

/**
 * Create a new profile with API key and optional organization ID
 */
export function createProfile(
  profileName: string,
  apiKey: string,
  orgId?: string,
): void {
  ensureConfigDirExists();

  const creds = parseCredsFile(CREDS_FILE);
  if (!creds[profileName]) {
    creds[profileName] = {};
  }

  creds[profileName].xpander_api_key = apiKey;

  if (orgId) {
    creds[profileName].xpander_organization_id = orgId;
  }

  saveCredsFile(CREDS_FILE, creds);

  // Set as current profile if it doesn't exist
  const config = readConfigFile(CONFIG_FILE);
  if (!config.current_profile) {
    config.current_profile = profileName;
    saveConfigFile(CONFIG_FILE, config);
  }
}

/**
 * Delete a profile
 */
export function deleteProfile(profileName: string): void {
  if (profileName === DEFAULT_PROFILE) {
    throw new Error('Cannot delete the default profile');
  }

  ensureConfigDirExists();

  const creds = parseCredsFile(CREDS_FILE);
  if (creds[profileName]) {
    delete creds[profileName];
    saveCredsFile(CREDS_FILE, creds);
  }

  // If the deleted profile was the current one, reset to default
  const config = readConfigFile(CONFIG_FILE);
  if (config.current_profile === profileName) {
    config.current_profile = DEFAULT_PROFILE;
    saveConfigFile(CONFIG_FILE, config);
  }
}

/**
 * Set the default profile in the credentials file
 */
export function setDefaultProfile(profileName: string): void {
  ensureConfigDirExists();

  // Ensure the profile exists
  const creds = parseCredsFile(CREDS_FILE);
  if (!creds[profileName]) {
    throw new Error(`Profile "${profileName}" does not exist`);
  }

  // Create or update the DEFAULT_SECTION
  if (!creds[DEFAULT_SECTION]) {
    creds[DEFAULT_SECTION] = {};
  }

  // Set the default profile
  creds[DEFAULT_SECTION].default_profile = profileName;
  saveCredsFile(CREDS_FILE, creds);

  // Also update the current profile in the config file for backward compatibility
  setCurrentProfile(profileName);
}
