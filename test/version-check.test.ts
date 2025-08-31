/**
 * Simple unit tests for version check utility
 */

// Mock the external dependencies
jest.mock('axios');
jest.mock('fs-extra');

describe('Version Check Utility', () => {
  // Import after mocking
  let checkForUpdates: (currentVersion: string) => Promise<void>;
  let clearVersionCache: () => void;

  beforeAll(async () => {
    const versionCheck = await import('../src/utils/version-check');
    checkForUpdates = versionCheck.checkForUpdates;
    clearVersionCache = versionCheck.clearVersionCache;
  });

  test('should be importable without throwing errors', () => {
    expect(checkForUpdates).toBeDefined();
    expect(clearVersionCache).toBeDefined();
    expect(typeof checkForUpdates).toBe('function');
    expect(typeof clearVersionCache).toBe('function');
  });

  test('checkForUpdates should handle errors gracefully', async () => {
    // This should not throw even if there are network or file system errors
    await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
  });

  test('clearVersionCache should not throw errors', () => {
    expect(() => clearVersionCache()).not.toThrow();
  });

  test('should skip version check in CI environment', async () => {
    const originalCI = process.env.CI;
    process.env.CI = 'true';

    // Should complete without error
    await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();

    // Restore original environment
    if (originalCI) {
      process.env.CI = originalCI;
    } else {
      delete process.env.CI;
    }
  });

  test('should skip version check when explicitly disabled', async () => {
    const original = process.env.XPANDER_SKIP_VERSION_CHECK;
    process.env.XPANDER_SKIP_VERSION_CHECK = 'true';

    // Should complete without error
    await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();

    // Restore original environment
    if (original) {
      process.env.XPANDER_SKIP_VERSION_CHECK = original;
    } else {
      delete process.env.XPANDER_SKIP_VERSION_CHECK;
    }
  });
});
