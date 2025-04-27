import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';

export const CLI_PATH = path.resolve(__dirname, '../src/index.ts');
export const CONFIG_DIR = path.join(os.homedir(), '.xpander');

export const executeCommand = (command: string) =>
  execSync(`ts-node --project tsconfig.dev.json ${CLI_PATH} ${command}`);
