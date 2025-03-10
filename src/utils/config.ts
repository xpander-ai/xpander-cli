import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';

// Config directory and files in user's home directory
const CONFIG_DIR = path.join(os.homedir(), '.xpander');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Default profile name
const DEFAULT_PROFILE = 'default';

// Default format
const DEFAULT_FORMAT = 'table';

// Config structure
interface ProfileConfig {
  api_key: string;
  organization_id?: string;
}

interface XpanderConfig {
  currentProfile: string;
  lastUsedAgentId?: string;
  preferredFormat: string;
  profiles: Record<string, ProfileConfig>;
}

/**
 * Default config structure
 */
const DEFAULT_CONFIG: XpanderConfig = {
  currentProfile: DEFAULT_PROFILE,
  preferredFormat: DEFAULT_FORMAT,
  profiles: {
    [DEFAULT_PROFILE]: {
      api_key: '',
    },
  },
};

/**
 * Ensures the config directory exists
 */
function ensureConfigDirExists(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get the config from the file, or create default if it doesn't exist
 */
function getConfig(): XpanderConfig {
  ensureConfigDirExists();

  try {
    // Try to read the new JSON config file
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return config as XpanderConfig;
    }

    // If no config file exists, create default
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  } catch (error) {
    console.error('Error reading config file:', error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save the config to the file
 */
function saveConfig(config: XpanderConfig): void {
  ensureConfigDirExists();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get the current active profile name
 */
export function getCurrentProfile(): string {
  const config = getConfig();
  return config.currentProfile || DEFAULT_PROFILE;
}

/**
 * Set the current active profile
 */
export function setCurrentProfile(profile: string): void {
  const config = getConfig();

  // Make sure the profile exists
  if (!config.profiles[profile]) {
    config.profiles[profile] = {
      api_key: '',
    };
  }

  config.currentProfile = profile;
  saveConfig(config);
}

/**
 * List all available profiles
 */
export function listProfiles(): string[] {
  const config = getConfig();
  return Object.keys(config.profiles);
}

/**
 * Get the API key for a profile
 */
export function getApiKey(profile?: string): string {
  const config = getConfig();
  const profileName = profile || config.currentProfile;

  if (!config.profiles[profileName]) {
    return '';
  }

  return config.profiles[profileName].api_key || '';
}

/**
 * Set the API key for a profile
 */
export function setApiKey(apiKey: string, profile?: string): void {
  const config = getConfig();
  const profileName = profile || config.currentProfile;

  // Create profile if it doesn't exist
  if (!config.profiles[profileName]) {
    config.profiles[profileName] = {
      api_key: apiKey,
    };
  } else {
    config.profiles[profileName].api_key = apiKey;
  }

  saveConfig(config);
}

/**
 * Get the organization ID for a profile
 */
export function getOrganizationId(profile?: string): string {
  const config = getConfig();
  const profileName = profile || config.currentProfile;

  if (!config.profiles[profileName]) {
    return '';
  }

  return config.profiles[profileName].organization_id || '';
}

/**
 * Set the organization ID for a profile
 */
export function setOrganizationId(
  organizationId: string,
  profile?: string,
): void {
  const config = getConfig();
  const profileName = profile || config.currentProfile;

  // Create profile if it doesn't exist
  if (!config.profiles[profileName]) {
    config.profiles[profileName] = {
      api_key: '',
      organization_id: organizationId,
    };
  } else {
    config.profiles[profileName].organization_id = organizationId;
  }

  saveConfig(config);
}

/**
 * Create or update a profile with API key and optional org ID
 */
export function createProfile(
  profileName: string,
  apiKey: string,
  organizationId?: string,
): void {
  const config = getConfig();

  config.profiles[profileName] = {
    api_key: apiKey,
    ...(organizationId ? { organization_id: organizationId } : {}),
  };

  saveConfig(config);
}

/**
 * Get the last used agent ID
 */
export function getLastUsedAgentId(): string {
  const config = getConfig();
  return config.lastUsedAgentId || '';
}

/**
 * Set the last used agent ID
 */
export function setLastUsedAgentId(agentId: string): void {
  const config = getConfig();
  config.lastUsedAgentId = agentId;
  saveConfig(config);
}

/**
 * Get the preferred output format
 */
export function getPreferredFormat(): string {
  const config = getConfig();
  return config.preferredFormat || DEFAULT_FORMAT;
}

/**
 * Set the preferred output format
 */
export function setPreferredFormat(format: string): void {
  const config = getConfig();
  config.preferredFormat = format;
  saveConfig(config);
}
