import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Check if xpander_handler.py exists in the current directory
 */
export function hasLocalHandler(): boolean {
  const handlerPath = path.join(process.cwd(), 'xpander_handler.py');
  return fs.existsSync(handlerPath);
}

/**
 * Check if Python is available on the system
 */
export function isPythonAvailable(): boolean {
  try {
    // Try python3 first, then python
    const pythonCommands = ['python3', 'python'];

    for (const cmd of pythonCommands) {
      try {
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        return true;
      } catch {
        // Continue to next command
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get the preferred Python command (python3 or python)
 */
export function getPythonCommand(): string {
  try {
    execSync('python3 --version', { stdio: 'ignore' });
    return 'python3';
  } catch {
    try {
      execSync('python --version', { stdio: 'ignore' });
      return 'python';
    } catch {
      throw new Error('Python is not available');
    }
  }
}

/**
 * Check if local handler is available and ready to use
 */
export function canUseLocalHandler(): boolean {
  return hasLocalHandler() && isPythonAvailable();
}
