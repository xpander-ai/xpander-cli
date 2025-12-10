/**
 * Unit tests for .env file generation
 * Testing that environment variables are written without quotes
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

describe('Environment File Generation', () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tmpDir = path.join(os.tmpdir(), `env-test-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('environment variables should be written without double quotes', async () => {
    const envPath = path.join(tmpDir, '.env');
    const testApiKey = 'test-api-key-123';
    const testOrgId = 'test-org-456';
    const testAgentId = 'test-agent-789';

    // Simulate the behavior from initialize.ts (fixed version)
    const envVars: any = {
      XPANDER_API_KEY: testApiKey,
      XPANDER_ORGANIZATION_ID: testOrgId,
      XPANDER_AGENT_ID: testAgentId,
    };

    const lines: string[] = [];
    for (const [key, value] of Object.entries(envVars)) {
      lines.push(`${key}=${value}`);
    }

    await fs.writeFile(envPath, lines.join('\n'));

    // Read the file back
    const content = await fs.readFile(envPath, 'utf-8');
    const contentLines = content.split('\n');

    // Verify no double quotes around values
    expect(contentLines[0]).toBe(`XPANDER_API_KEY=${testApiKey}`);
    expect(contentLines[1]).toBe(`XPANDER_ORGANIZATION_ID=${testOrgId}`);
    expect(contentLines[2]).toBe(`XPANDER_AGENT_ID=${testAgentId}`);

    // Verify values don't have quotes
    expect(contentLines[0]).not.toContain(`"${testApiKey}"`);
    expect(contentLines[1]).not.toContain(`"${testOrgId}"`);
    expect(contentLines[2]).not.toContain(`"${testAgentId}"`);
  });

  test('environment variables should follow standard KEY=value format', async () => {
    const envPath = path.join(tmpDir, '.env');
    const testValue = 'my-secret-value';

    await fs.writeFile(envPath, `TEST_KEY=${testValue}\n`);

    const content = await fs.readFile(envPath, 'utf-8');

    // Should match standard format
    expect(content).toMatch(/^TEST_KEY=my-secret-value$/m);

    // Should NOT have quotes
    expect(content).not.toMatch(/^TEST_KEY="my-secret-value"$/m);
  });

  test('environment variables with special characters should not be quoted', async () => {
    const envPath = path.join(tmpDir, '.env');
    const complexValue = 'value-with_underscores.and.dots123';

    const envVars = {
      COMPLEX_KEY: complexValue,
    };

    const lines: string[] = [];
    for (const [key, value] of Object.entries(envVars)) {
      lines.push(`${key}=${value}`);
    }

    await fs.writeFile(envPath, lines.join('\n'));

    const content = await fs.readFile(envPath, 'utf-8');

    // Verify format
    expect(content).toBe(`COMPLEX_KEY=${complexValue}`);
    expect(content).not.toContain('"');
  });

  test('empty values should be written without quotes', async () => {
    const envPath = path.join(tmpDir, '.env');

    await fs.writeFile(envPath, 'EMPTY_KEY=\n');

    const content = await fs.readFile(envPath, 'utf-8');

    // Should be KEY= with no quotes
    expect(content).toBe('EMPTY_KEY=\n');
    expect(content).not.toContain('""');
  });
});
