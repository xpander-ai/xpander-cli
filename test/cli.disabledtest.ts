import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CLI_PATH = path.resolve(__dirname, '../lib/index.js');
const CONFIG_DIR = path.join(os.homedir(), '.xpander');

describe('Xpander CLI', () => {
  beforeAll(() => {
    // Make sure the config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  });

  test('CLI shows help when run with --help', () => {
    const output = execSync(`node ${CLI_PATH} --help`).toString();
    expect(output).toContain('Usage: xpander|x [options] [command]');
    expect(output).toContain('Xpander.ai CLI for managing AI agents');
    expect(output).toContain('configure');
    expect(output).toContain('agent');
    expect(output).toContain('profile');
  });

  test('CLI shows version when run with --version', () => {
    const output = execSync(`node ${CLI_PATH} --version`).toString();
    expect(output).toMatch(/\d+\.\d+\.\d+/); // Should match a semver version
  });
});
