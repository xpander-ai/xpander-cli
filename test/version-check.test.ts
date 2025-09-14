/**
 * Comprehensive unit tests for version check utility
 */

import * as os from 'os';
import * as path from 'path';
import axios from 'axios';
import * as fs from 'fs-extra';

// Mock the external dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('boxen', () => {
  return jest.fn((message) => `BOXED: ${message}`);
});

// Mock console.log to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Version Check Utility', () => {
  let checkForUpdates: (currentVersion: string) => Promise<void>;
  let clearVersionCache: () => void;

  const CONFIG_DIR = path.join(os.homedir(), '.xpander');
  const VERSION_CACHE_FILE = path.join(CONFIG_DIR, 'version_cache.json');

  beforeAll(async () => {
    const versionCheck = await import('../src/utils/version-check');
    checkForUpdates = versionCheck.checkForUpdates;
    clearVersionCache = versionCheck.clearVersionCache;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();

    // Reset environment variables
    delete process.env.CI;
    delete process.env.XPANDER_SKIP_VERSION_CHECK;
    delete process.env.NODE_ENV;
  });

  describe('Basic functionality', () => {
    test('should be importable without throwing errors', () => {
      expect(checkForUpdates).toBeDefined();
      expect(clearVersionCache).toBeDefined();
      expect(typeof checkForUpdates).toBe('function');
      expect(typeof clearVersionCache).toBe('function');
    });

    test('clearVersionCache should not throw errors', () => {
      expect(() => clearVersionCache()).not.toThrow();
    });
  });

  describe('Environment skipping', () => {
    test('should skip version check in CI environment', async () => {
      process.env.CI = 'true';
      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    test('should skip version check when explicitly disabled', async () => {
      process.env.XPANDER_SKIP_VERSION_CHECK = 'true';
      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    test('should skip version check in test environment', async () => {
      process.env.NODE_ENV = 'test';
      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('Cache functionality', () => {
    test('should use cached version when cache is valid', async () => {
      const mockCacheData = {
        latestVersion: '1.5.0',
        timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago (within 12 hour cache)
      };

      mockedFs.existsSync.mockImplementation((filePath) => {
        if (filePath === VERSION_CACHE_FILE) return true;
        return false;
      });
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockCacheData));

      await checkForUpdates('1.0.0');

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        VERSION_CACHE_FILE,
        'utf8',
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalled(); // Should display update warning
    });

    test('should fetch from npm when cache is expired', async () => {
      const expiredCacheData = {
        latestVersion: '1.5.0',
        timestamp: Date.now() - 1000 * 60 * 60 * 24, // 24 hours ago (expired)
      };

      mockedFs.existsSync.mockImplementation((filePath) => {
        if (filePath === VERSION_CACHE_FILE) return true;
        return false;
      });
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(expiredCacheData));
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '2.0.0' } },
      });

      await checkForUpdates('1.0.0');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://registry.npmjs.org/xpander-cli',
        { timeout: 5000 },
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    test('should fetch from npm when no cache exists', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '2.0.0' } },
      });

      await checkForUpdates('1.0.0');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://registry.npmjs.org/xpander-cli',
        { timeout: 5000 },
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    test('should handle cache read errors gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '2.0.0' } },
      });

      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      expect(mockedAxios.get).toHaveBeenCalled();
    });
  });

  describe('Version comparison', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
    });

    test('should show update for newer major version', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '2.0.0' } },
      });

      await checkForUpdates('1.0.0');

      expect(mockConsoleLog).toHaveBeenCalled();
      const loggedMessage = mockConsoleLog.mock.calls[0][0];
      expect(loggedMessage).toContain('2.0.0');
      expect(loggedMessage).toContain('1.0.0');
    });

    test('should show update for newer minor version', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '1.5.0' } },
      });

      await checkForUpdates('1.0.0');

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should show update for newer patch version', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '1.0.1' } },
      });

      await checkForUpdates('1.0.0');

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should not show update for same version', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '1.0.0' } },
      });

      await checkForUpdates('1.0.0');

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('should not show update for older version', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '1.0.0' } },
      });

      await checkForUpdates('2.0.0');

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('should handle version strings with v prefix', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: 'v2.0.0' } },
      });

      await checkForUpdates('v1.0.0');

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should show update for development version (0.0.0)', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '1.0.0' } },
      });

      await checkForUpdates('0.0.0');

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle different length version numbers', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '1.0.0.1' } },
      });

      await checkForUpdates('1.0');

      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    test('should handle network errors gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('should handle invalid npm response', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': {} }, // No latest tag
      });

      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    test('should handle cache write errors gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });
      mockedAxios.get.mockResolvedValue({
        data: { 'dist-tags': { latest: '2.0.0' } },
      });

      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
      // Should still show update even if caching fails
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('should handle general errors in checkForUpdates', async () => {
      // Force an error by making existsSync throw
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(checkForUpdates('1.0.0')).resolves.toBeUndefined();
    });
  });

  describe('clearVersionCache', () => {
    test('should remove cache file when it exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {});

      clearVersionCache();

      expect(mockedFs.existsSync).toHaveBeenCalledWith(VERSION_CACHE_FILE);
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(VERSION_CACHE_FILE);
    });

    test('should do nothing when cache file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      clearVersionCache();

      expect(mockedFs.existsSync).toHaveBeenCalledWith(VERSION_CACHE_FILE);
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    test('should handle unlink errors gracefully', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Unlink error');
      });

      expect(() => clearVersionCache()).not.toThrow();
    });
  });
});
