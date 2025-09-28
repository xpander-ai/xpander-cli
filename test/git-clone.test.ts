/**
 * Tests for git clone utility with SSH to HTTPS fallback
 */

// Mock child_process at the module level
const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: mockExec,
}));

import {
  testSshToHttpsConversion,
  cloneWithFallback,
} from '../src/utils/git-clone';

// Mock chalk to avoid color output in tests
jest.mock('chalk', () => ({
  yellow: jest.fn((text: string) => text),
  green: jest.fn((text: string) => text),
  red: jest.fn((text: string) => text),
}));

describe('Git Clone Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SSH to HTTPS conversion', () => {
    test('should convert SSH URL to HTTPS', () => {
      const sshUrl = 'git@github.com:owner/repo.git';
      const expectedHttps = 'https://github.com/owner/repo.git';
      expect(testSshToHttpsConversion(sshUrl)).toBe(expectedHttps);
    });

    test('should handle different domains', () => {
      expect(testSshToHttpsConversion('git@gitlab.com:owner/repo.git')).toBe(
        'https://gitlab.com/owner/repo.git',
      );

      expect(testSshToHttpsConversion('git@bitbucket.org:owner/repo.git')).toBe(
        'https://bitbucket.org/owner/repo.git',
      );

      expect(testSshToHttpsConversion('git@example.io:owner/repo.git')).toBe(
        'https://example.io/owner/repo.git',
      );
    });

    test('should return HTTPS URLs unchanged', () => {
      const httpsUrl = 'https://github.com/owner/repo.git';
      expect(testSshToHttpsConversion(httpsUrl)).toBe(httpsUrl);
    });

    test('should convert HTTP to HTTPS', () => {
      const httpUrl = 'http://github.com/owner/repo.git';
      const expectedHttps = 'https://github.com/owner/repo.git';
      expect(testSshToHttpsConversion(httpUrl)).toBe(expectedHttps);
    });

    test('should handle non-standard formats gracefully', () => {
      const customUrl = 'custom://example.com/repo.git';
      expect(testSshToHttpsConversion(customUrl)).toBe(customUrl);
    });
  });

  describe('cloneWithFallback', () => {
    test('should succeed on first SSH attempt', async () => {
      // Mock successful execution
      mockExec.mockImplementation((command: string, callback: any) => {
        process.nextTick(() =>
          callback(null, { stdout: 'success', stderr: '' }),
        );
        return {} as any;
      });

      await expect(
        cloneWithFallback('git@github.com:owner/repo.git', '/tmp/dest'),
      ).resolves.toBeUndefined();

      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(mockExec).toHaveBeenCalledWith(
        'git clone --depth 1 git@github.com:owner/repo.git /tmp/dest',
        expect.any(Function),
      );
    });

    test('should retry with HTTPS when SSH fails', async () => {
      let callCount = 0;
      mockExec.mockImplementation((command: string, callback: any) => {
        callCount++;
        if (callCount === 1) {
          // First call (SSH) fails
          process.nextTick(() =>
            callback(new Error('SSH authentication failed'), null),
          );
        } else {
          // Second call (HTTPS) succeeds
          process.nextTick(() =>
            callback(null, { stdout: 'success', stderr: '' }),
          );
        }
        return {} as any;
      });

      const mockConsoleLog = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      await expect(
        cloneWithFallback('git@github.com:owner/repo.git', '/tmp/dest'),
      ).resolves.toBeUndefined();

      expect(mockExec).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('SSH clone failed, retrying with HTTPS...'),
      );

      mockConsoleLog.mockRestore();
    });

    test('should throw error when both SSH and HTTPS fail', async () => {
      mockExec.mockImplementation((command: string, callback: any) => {
        process.nextTick(() => callback(new Error('Network error'), null));
        return {} as any;
      });

      const mockConsoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(
        cloneWithFallback('git@github.com:owner/repo.git', '/tmp/dest'),
      ).rejects.toThrow('Failed to clone repository with both SSH and HTTPS');

      expect(mockExec).toHaveBeenCalledTimes(2);
      mockConsoleError.mockRestore();
    });

    test('should not retry for non-SSH URLs', async () => {
      mockExec.mockImplementation((command: string, callback: any) => {
        process.nextTick(() => callback(new Error('Network error'), null));
        return {} as any;
      });

      await expect(
        cloneWithFallback('https://github.com/owner/repo.git', '/tmp/dest'),
      ).rejects.toThrow('Network error');

      // Should only try once since it's already HTTPS
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    test('should use custom git clone options', async () => {
      let capturedCommand = '';
      mockExec.mockImplementation((command: string, callback: any) => {
        capturedCommand = command;
        process.nextTick(() =>
          callback(null, { stdout: 'success', stderr: '' }),
        );
        return {} as any;
      });

      await cloneWithFallback(
        'git@github.com:owner/repo.git',
        '/tmp/dest',
        '--depth 5 --branch main',
      );

      expect(capturedCommand).toContain('--depth 5 --branch main');
      expect(capturedCommand).toBe(
        'git clone --depth 5 --branch main git@github.com:owner/repo.git /tmp/dest',
      );
    });
  });
});
