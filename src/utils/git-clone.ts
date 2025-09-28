import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Convert SSH Git URL to HTTPS format
 * @param sshUrl SSH Git URL (e.g., git@github.com:owner/repo.git)
 * @returns HTTPS Git URL (e.g., https://github.com/owner/repo.git)
 */
function convertSshToHttps(sshUrl: string): string {
  // Handle SSH URLs in the format: git@github.com:owner/repo.git
  if (sshUrl.startsWith('git@')) {
    // Use regex to handle any domain format
    const match = sshUrl.match(/^git@([^:]+):(.+)$/);
    if (match) {
      const [, domain, path] = match;
      return `https://${domain}/${path}`;
    }
  }

  // If it's already HTTPS, return as is
  if (sshUrl.startsWith('https://')) {
    return sshUrl;
  }

  // If it's HTTP, convert to HTTPS
  if (sshUrl.startsWith('http://')) {
    return sshUrl.replace('http://', 'https://');
  }

  // Default: assume it's already in a valid format
  return sshUrl;
}

/**
 * Clone a Git repository with SSH to HTTPS fallback
 * @param repoUrl Git repository URL (SSH or HTTPS)
 * @param destPath Destination path for cloning
 * @param options Additional git clone options (e.g., '--depth 1')
 * @returns Promise that resolves when clone is successful
 */
export async function cloneWithFallback(
  repoUrl: string,
  destPath: string,
  options: string = '--depth 1',
): Promise<void> {
  const fullCommand = `git clone ${options} ${repoUrl} ${destPath}`;

  try {
    // First attempt with the original URL (likely SSH)
    await execAsync(fullCommand);
    return; // Success on first try
  } catch (sshError: any) {
    // If SSH failed, try to convert to HTTPS and retry
    const httpsUrl = convertSshToHttps(repoUrl);

    // Only retry if we actually converted the URL
    if (httpsUrl !== repoUrl) {
      console.log(chalk.yellow(`SSH clone failed, retrying with HTTPS...`));

      try {
        const httpsCommand = `git clone ${options} ${httpsUrl} ${destPath}`;
        await execAsync(httpsCommand);
        console.log(chalk.green(`✓ Successfully cloned using HTTPS`));
        return; // Success on HTTPS retry
      } catch (httpsError: any) {
        // Both SSH and HTTPS failed
        console.error(chalk.red(`SSH clone error: ${sshError.message}`));
        console.error(chalk.red(`HTTPS clone error: ${httpsError.message}`));
        throw new Error(
          `Failed to clone repository with both SSH and HTTPS. ` +
            `SSH error: ${sshError.message}. HTTPS error: ${httpsError.message}`,
        );
      }
    } else {
      // URL wasn't SSH format, so just throw the original error
      throw sshError;
    }
  }
}

/**
 * Test function to expose SSH to HTTPS conversion for unit tests
 */
export function testSshToHttpsConversion(url: string): string {
  return convertSshToHttps(url);
}
