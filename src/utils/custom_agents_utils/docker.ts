import { spawn, exec } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import ora from 'ora';

const execAsync = promisify(exec);

/**
 * Run a command and stream stdout/stderr to console
 */
const runCommandWithLogs = (command: string, args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'inherit' });

    process.on('error', (err) => reject(err));
    process.on('exit', (code) => {
      if (code !== 0) {
        return reject(new Error(`${command} exited with code ${code}`));
      }
      resolve();
    });
  });
};

/**
 * Ensures Docker CLI is installed by checking `docker --version`.
 */
const ensureDockerInstalled = async (
  deploymentSpinner: ora.Ora,
): Promise<boolean> => {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    deploymentSpinner.fail(
      `❌ Docker CLI not found. Please install Docker: https://docs.docker.com/get-docker/`,
    );
  }
  return false;
};

/**
 * Ensures Docker daemon is running and accessible via `docker info`.
 */
const ensureDockerRunning = async (
  deploymentSpinner: ora.Ora,
): Promise<boolean> => {
  try {
    await execAsync('docker info');
    return true;
  } catch {
    deploymentSpinner.fail(
      `❌ Docker daemon is not running or inaccessible.\n👉 Start Docker Desktop or your Docker engine.`,
    );
  }
  return false;
};

/**
 * Builds a Docker image from a Dockerfile and saves it as a gzipped .tar.gz archive.
 *
 * @param contextPath - Path to the Docker build context (directory with Dockerfile).
 * @param imageName - Name for the Docker image.
 * @returns Full path to the resulting .tar.gz archive.
 */
export const buildAndSaveDockerImage = async (
  deploymentSpinner: ora.Ora,
  contextPath: string,
  imageName: string,
): Promise<string | undefined> => {
  const resolvedContext = path.resolve(contextPath);
  const fullImageName = `${imageName}:latest`;

  // Safety checks
  if (!(await ensureDockerInstalled(deploymentSpinner))) return;
  if (!(await ensureDockerRunning(deploymentSpinner))) return;

  if (
    !fs.existsSync(resolvedContext) ||
    !fs.statSync(resolvedContext).isDirectory()
  ) {
    deploymentSpinner.fail('Invalid context path');
    return;
  }

  const tempDir = os.tmpdir();
  const baseTarName = `${imageName.replace(/[/:]/g, '_')}_${randomUUID()}`;
  const tarPath = path.join(tempDir, `${baseTarName}.tar`);
  const compressedPath = `${tarPath}.gz`;

  deploymentSpinner.text = 'Building your AI Agent';
  await runCommandWithLogs('docker', [
    'buildx',
    'build',
    '--platform=linux/amd64,linux/arm64',
    '-t',
    fullImageName,
    resolvedContext,
  ]);

  // Test the image locally before proceeding with export
  const testPassed = await testDockerImage(deploymentSpinner, imageName, 10);
  if (!testPassed) {
    return;
  }

  deploymentSpinner.text = 'Exporting your AI Agent files';
  await runCommandWithLogs('docker', ['save', '-o', tarPath, fullImageName]);

  if (!fs.existsSync(tarPath)) {
    deploymentSpinner.fail('Failed to save Docker image');
    return;
  }

  deploymentSpinner.text = 'Compressing';
  await runCommandWithLogs('gzip', [tarPath]);

  if (!fs.existsSync(compressedPath)) {
    deploymentSpinner.fail('Failed to compress');
    return;
  }

  return compressedPath;
};

/**
 * Tests a Docker image by running it and checking logs for required messages.
 *
 * @param deploymentSpinner - Spinner instance for status updates
 * @param imageName - Name of the Docker image to test
 * @param timeoutSeconds - How long to wait for the container (default: 10)
 * @returns Promise<boolean> - true if test passes, false otherwise
 */
export const testDockerImage = async (
  deploymentSpinner: ora.Ora,
  imageName: string,
  timeoutSeconds: number = 10,
): Promise<boolean> => {
  // Safety checks
  if (!(await ensureDockerInstalled(deploymentSpinner))) return false;
  if (!(await ensureDockerRunning(deploymentSpinner))) return false;

  const fullImageName = `${imageName}:latest`;
  const containerName = `test_${imageName.replace(/[/:]/g, '_')}_${randomUUID().substring(0, 8)}`;

  try {
    deploymentSpinner.text = 'Testing the container locally...';

    // Start the container in detached mode
    await execAsync(`docker run -d --name ${containerName} ${fullImageName}`);

    // Wait for the specified timeout while keeping the same spinner text
    await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));

    // Get container logs (both stdout and stderr)
    const { stdout: allLogs } = await execAsync(
      `docker logs ${containerName} 2>&1`,
    );

    // Check for required log messages (case insensitive)
    const logsLower = allLogs.toLowerCase();
    const hasWorkerRegistered = logsLower.includes('worker registered');
    const hasXpanderAgents = logsLower.includes('xpander.ai/agents');

    if (!hasWorkerRegistered || !hasXpanderAgents) {
      deploymentSpinner.fail(
        `Local image test failed:\n` +
          `\n--- Container Logs ---\n${allLogs || '(no logs captured)'}`,
      );
      return false;
    }

    // Don't stop the spinner - let the build process continue
    return true;
  } catch (error: any) {
    // Get logs even if there was an error
    let containerLogs = '';
    try {
      const { stdout } = await execAsync(`docker logs ${containerName} 2>&1`);
      containerLogs = stdout;
    } catch {
      // If we can't get logs, that's okay
    }

    const logSection = containerLogs
      ? `\n\n--- Container Logs ---\n${containerLogs}`
      : '';
    deploymentSpinner.fail(
      `Local image test failed: ${error.message}${logSection}`,
    );
    return false;
  } finally {
    // Clean up the test container
    try {
      await execAsync(`docker rm -f ${containerName}`);
    } catch {
      // Ignore cleanup errors
    }
  }
};
