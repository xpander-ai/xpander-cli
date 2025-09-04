import * as os from 'os';
import * as path from 'path';
import axios from 'axios';
import boxen from 'boxen';
import chalk from 'chalk';
import * as fs from 'fs-extra';

// Config directory in user's home directory
const CONFIG_DIR = path.join(os.homedir(), '.xpander');
const VERSION_CACHE_FILE = path.join(CONFIG_DIR, 'version_cache.json');

// Cache duration: 12 hours in milliseconds
const CACHE_DURATION = 12 * 60 * 60 * 1000;

interface VersionCacheData {
  latestVersion: string;
  timestamp: number;
}

/**
 * Ensures the config directory exists
 */
function ensureConfigDirExists(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get cached version information
 */
function getCachedVersion(): VersionCacheData | null {
  try {
    if (!fs.existsSync(VERSION_CACHE_FILE)) {
      return null;
    }

    const cacheData: VersionCacheData = JSON.parse(
      fs.readFileSync(VERSION_CACHE_FILE, 'utf8'),
    );

    // Check if cache is expired
    const now = Date.now();
    const isExpired = now - cacheData.timestamp > CACHE_DURATION;

    if (isExpired) {
      return null;
    }

    return cacheData;
  } catch (error) {
    // If there's any error reading cache, return null to force refresh
    return null;
  }
}

/**
 * Cache the latest version information
 */
function setCachedVersion(latestVersion: string): void {
  try {
    ensureConfigDirExists();

    const cacheData: VersionCacheData = {
      latestVersion,
      timestamp: Date.now(),
    };

    fs.writeFileSync(VERSION_CACHE_FILE, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    // Silently fail cache writes to avoid breaking the main functionality
  }
}

/**
 * Fetch the latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string | null> {
  try {
    // Try the scoped package first (xpander-cli)
    let response;
    try {
      response = await axios.get('https://registry.npmjs.org/xpander-cli', {
        timeout: 5000, // 5 second timeout
      });
    } catch (scopedError) {
      // If scoped package fails, try the unscoped package (xpander-cli)
      response = await axios.get('https://registry.npmjs.org/xpander-cli', {
        timeout: 5000, // 5 second timeout
      });
    }

    return response.data['dist-tags']?.latest || null;
  } catch (error) {
    // Silently fail version checks to avoid breaking the CLI
    return null;
  }
}

/**
 * Compare version strings (simple semantic version comparison)
 */
function isNewerVersion(
  latestVersion: string,
  currentVersion: string,
): boolean {
  if (!latestVersion || !currentVersion) {
    return false;
  }

  // Remove 'v' prefix if present
  const latest = latestVersion.replace(/^v/, '');
  const current = currentVersion.replace(/^v/, '');

  // Special case: if current version is 0.0.0 (development), always show update if a published version exists
  if (current === '0.0.0' && latest !== '0.0.0') {
    return true;
  }

  const latestParts = latest.split('.').map((part) => parseInt(part, 10));
  const currentParts = current.split('.').map((part) => parseInt(part, 10));

  // Pad arrays to same length with zeros
  while (latestParts.length < currentParts.length) {
    latestParts.push(0);
  }
  while (currentParts.length < latestParts.length) {
    currentParts.push(0);
  }

  // Compare each part
  for (let i = 0; i < latestParts.length; i++) {
    if (latestParts[i] > currentParts[i]) {
      return true;
    }
    if (latestParts[i] < currentParts[i]) {
      return false;
    }
  }

  return false;
}

/**
 * Display update warning to the user
 */
function displayUpdateWarning(
  latestVersion: string,
  currentVersion: string,
): void {
  const updateMessage = `A new version of xpander CLI is available!
${chalk.gray(`Current: ${currentVersion}`)}
${chalk.green(`Latest:  ${latestVersion}`)}

Run the following command to update:
${chalk.cyan('npm install -g xpander-cli')}`;

  console.log(
    boxen(updateMessage, {
      padding: 1,
      margin: { top: 0, right: 0, bottom: 1, left: 0 },
      borderStyle: 'single',
      borderColor: 'yellow',
      title: chalk.yellow('⚠️  Update Available'),
      titleAlignment: 'center',
    }),
  );
}

/**
 * Check for outdated version and display warning if needed
 */
export async function checkForUpdates(currentVersion: string): Promise<void> {
  try {
    // Skip version check in CI environments or if explicitly disabled
    if (
      process.env.CI ||
      process.env.XPANDER_SKIP_VERSION_CHECK === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }

    // First check cache
    let latestVersion: string | null = null;
    const cachedData = getCachedVersion();

    if (cachedData) {
      latestVersion = cachedData.latestVersion;
    } else {
      // Fetch from npm registry if not cached or cache expired
      latestVersion = await fetchLatestVersion();
      if (latestVersion) {
        setCachedVersion(latestVersion);
      }
    }

    // Check if update is available
    if (latestVersion && isNewerVersion(latestVersion, currentVersion)) {
      displayUpdateWarning(latestVersion, currentVersion);
    }
  } catch (error) {
    // Silently fail version checks to avoid breaking the CLI
  }
}

/**
 * Clear the version cache (useful for testing or manual cache refresh)
 */
export function clearVersionCache(): void {
  try {
    if (fs.existsSync(VERSION_CACHE_FILE)) {
      fs.unlinkSync(VERSION_CACHE_FILE);
    }
  } catch (error) {
    // Silently fail cache clearing
  }
}
