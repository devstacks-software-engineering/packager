import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

// Mock the fs and path modules
vi.mock('node:fs', () => ({
  default: {
    statSync: vi.fn(),
  },
}));

vi.mock('node:path', () => ({
  default: {
    extname: vi.fn(),
    basename: vi.fn(),
    dirname: vi.fn(),
  },
}));

// Mock formatFileSize function
vi.mock('../../src/utils.js', () => ({
  formatFileSize: vi.fn((size) => `${size} formatted`),
}));

describe('CLI Utils Tests', () => {
  // Mock console functions
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();

    // Clear mock function call history without resetting them
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  // Module import tests
  describe('Module Imports', () => {
    it('should successfully import all utility functions', async () => {
      // Import the module
      const utils = await import('../../src/cli/utils.js');

      // Verify that the utility functions were imported successfully
      expect(utils.success).toBeDefined();
      expect(utils.error).toBeDefined();
      expect(utils.info).toBeDefined();
      expect(utils.warning).toBeDefined();
      expect(utils.createSpinner).toBeDefined();
      expect(utils.validatePath).toBeDefined();
      expect(utils.getFileInfo).toBeDefined();

      // Check that they are functions
      expect(typeof utils.success).toBe('function');
      expect(typeof utils.error).toBe('function');
      expect(typeof utils.info).toBe('function');
      expect(typeof utils.warning).toBe('function');
      expect(typeof utils.createSpinner).toBe('function');
      expect(typeof utils.validatePath).toBe('function');
      expect(typeof utils.getFileInfo).toBe('function');
    });
  });

  // Message display tests
  describe('Message Display Functions', () => {
    it('should display colored success messages', async () => {
      const utils = await import('../../src/cli/utils.js');

      utils.success('Test success');
      expect(console.log).toHaveBeenCalledWith(chalk.green('✓ Test success'));
    });

    it('should display colored info messages', async () => {
      const utils = await import('../../src/cli/utils.js');

      utils.info('Test info');
      expect(console.log).toHaveBeenCalledWith(chalk.blue('ℹ Test info'));
    });

    it('should display colored warning messages', async () => {
      const utils = await import('../../src/cli/utils.js');

      utils.warning('Test warning');
      expect(console.log).toHaveBeenCalledWith(chalk.yellow('⚠ Test warning'));
    });

    it('should display colored error messages', async () => {
      const utils = await import('../../src/cli/utils.js');

      utils.error('Test error');
      expect(console.error).toHaveBeenCalledWith(chalk.red('✗ Test error'));
    });
  });

  // validatePath function tests
  describe('validatePath Function', () => {
    it('should return true when path exists and is a file when expecting a file', async () => {
      // Mock fs.statSync to return a file
      vi.mocked(fs.statSync).mockReturnValueOnce({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);

      const utils = await import('../../src/cli/utils.js');

      const result = utils.validatePath('/test/file.txt', 'file');

      expect(fs.statSync).toHaveBeenCalledWith('/test/file.txt');
      expect(result).toBe(true);
    });

    it('should return true when path exists and is a directory when expecting a directory', async () => {
      // Mock fs.statSync to return a directory
      vi.mocked(fs.statSync).mockReturnValueOnce({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);

      const utils = await import('../../src/cli/utils.js');

      const result = utils.validatePath('/test/dir', 'directory');

      expect(fs.statSync).toHaveBeenCalledWith('/test/dir');
      expect(result).toBe(true);
    });

    it('should return false when path exists but is not a file when expecting a file', async () => {
      // Mock fs.statSync to return a directory
      vi.mocked(fs.statSync).mockReturnValueOnce({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);

      const utils = await import('../../src/cli/utils.js');

      const result = utils.validatePath('/test/dir', 'file');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Path is not a file'));
    });

    it('should return false when path exists but is not a directory when expecting a directory', async () => {
      // Mock fs.statSync to return a file
      vi.mocked(fs.statSync).mockReturnValueOnce({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);

      const utils = await import('../../src/cli/utils.js');

      const result = utils.validatePath('/test/file.txt', 'directory');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Path is not a directory'));
    });

    it('should return false when path does not exist', async () => {
      // Mock fs.statSync to throw an error (path does not exist)
      vi.mocked(fs.statSync).mockImplementationOnce(() => {
        throw new Error('ENOENT');
      });

      const utils = await import('../../src/cli/utils.js');

      const result = utils.validatePath('/test/nonexistent', 'file');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Path does not exist'));
    });
  });

  // getFileInfo function tests
  describe('getFileInfo Function', () => {
    it('should return file information when file exists', async () => {
      const testSize = 12345;
      const testPath = '/test/file.txt';

      // Mock fs.statSync
      vi.mocked(fs.statSync).mockReturnValueOnce({
        size: testSize,
      } as unknown as fs.Stats);

      // Mock path functions
      vi.mocked(path.extname).mockReturnValueOnce('.txt');
      vi.mocked(path.basename).mockReturnValueOnce('file.txt');
      vi.mocked(path.dirname).mockReturnValueOnce('/test');

      const utils = await import('../../src/cli/utils.js');
      const formatFileSize = await import('../../src/utils.js');

      const result = utils.getFileInfo(testPath);

      expect(fs.statSync).toHaveBeenCalledWith(testPath);
      expect(path.extname).toHaveBeenCalledWith(testPath);
      expect(path.basename).toHaveBeenCalledWith(testPath);
      expect(path.dirname).toHaveBeenCalledWith(testPath);
      expect(formatFileSize.formatFileSize).toHaveBeenCalledWith(testSize);

      expect(result).toEqual({
        size: testSize,
        formattedSize: `${testSize} formatted`,
        extension: '.txt',
        basename: 'file.txt',
        dirname: '/test',
      });
    });

    it('should return null when file does not exist', async () => {
      // Mock fs.statSync to throw an error (file does not exist)
      vi.mocked(fs.statSync).mockImplementationOnce(() => {
        throw new Error('ENOENT');
      });

      const utils = await import('../../src/cli/utils.js');

      const result = utils.getFileInfo('/test/nonexistent');

      expect(result).toBeNull();
    });
  });

  // createSpinner function tests
  describe('createSpinner Function', () => {
    it('should create a spinner with the given text', async () => {
      // We need to test createSpinner differently since ora is an external dependency
      // Focus on testing that it returns an object with the expected interface
      const utils = await import('../../src/cli/utils.js');

      const spinner = utils.createSpinner('Test spinner');

      // Check that the spinner exists and has the expected properties
      expect(spinner).toBeDefined();
      expect(spinner.text).toBe('Test spinner');
      expect(spinner.start).toBeTypeOf('function');
      expect(spinner.succeed).toBeTypeOf('function');
      expect(spinner.fail).toBeTypeOf('function');
    });
  });
});