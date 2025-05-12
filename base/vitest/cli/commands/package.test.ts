import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks } from './common.test.js';

// Setup mocks before importing modules
setupMocks();

// Import modules after mocks are configured
import { handlePackage } from '../../../src/cli/commands.js';
import * as utils from '../../../src/cli/utils.js';
import * as core from '../../../src/index.js';
import * as fs from 'node:fs';

describe('Package Commands', () => {
  // Reset mocks before each test to ensure clean state
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock implementations for fs functions used in handlers
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
  });

  describe('handlePackage', () => {
    it('should create a package with signing if private key provided', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {
        algorithm: 'gzip',
        privkey: '/path/to/private.key'
      };

      // Setup mocks for file info
      vi.mocked(utils.getFileInfo)
        .mockReturnValueOnce({ // Archive info
          size: 2048,
          formattedSize: '2 KB',
          extension: '.dsap',
          basename: 'archive.dsap',
          dirname: '/path/to'
        })
        .mockReturnValueOnce({ // Package info
          size: 1024,
          formattedSize: '1 KB',
          extension: '.gz',
          basename: 'archive.gz',
          dirname: '/path/to'
        });

      // Setup mock for create package with signature path
      vi.mocked(core.createPackage).mockResolvedValueOnce({
        archivePath: '/path/to/archive.archive',
        compressedPath: '/path/to/archive.compressed',
        signaturePath: '/path/to/archive.signature'
      });

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'directory');
      expect(core.getCompressionAlgorithm).toHaveBeenCalledWith('gzip');
      expect(core.createPackage).toHaveBeenCalledWith(
        sourcePath,
        outputPath,
        'gzip',
        { privateKeyPath: '/path/to/private.key' }
      );

      // Should display signature path when present
      expect(utils.info).toHaveBeenCalledWith('  Signature: /path/to/archive.signature');

      // Should calculate compression ratio
      expect(utils.info).toHaveBeenCalledWith('Compression ratio: 50.00%');

      // Should clean up temporary files when requested
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/archive.archive');
    });

    it('should create a package without signing if no private key provided', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {
        algorithm: 'brotli'
      };

      // Setup mocks for file info
      vi.mocked(utils.getFileInfo)
        .mockReturnValueOnce({ // Archive info
          size: 2048,
          formattedSize: '2 KB',
          extension: '.dsap',
          basename: 'archive.dsap',
          dirname: '/path/to'
        })
        .mockReturnValueOnce({ // Package info
          size: 1024,
          formattedSize: '1 KB',
          extension: '.br',
          basename: 'archive.br',
          dirname: '/path/to'
        });

      // Setup mock for create package WITHOUT signature path
      vi.mocked(core.createPackage).mockResolvedValueOnce({
        archivePath: '/path/to/archive.archive',
        compressedPath: '/path/to/archive.compressed',
        signaturePath: null
      });

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'directory');
      expect(core.getCompressionAlgorithm).toHaveBeenCalledWith('brotli');
      expect(core.createPackage).toHaveBeenCalledWith(
        sourcePath,
        outputPath,
        'gzip', // This is the mocked return value
        undefined // No signing options
      );

      // Should not display signature path when absent
      const infoCallArgs = vi.mocked(utils.info).mock.calls.map(call => call[0]);
      expect(infoCallArgs.some(arg => arg.includes('Signature:'))).toBe(false);

      // Should calculate compression ratio
      expect(utils.info).toHaveBeenCalledWith('Compression ratio: 50.00%');

      // Should always clean up temporary files
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/archive.archive');
    });

    it('should handle package creation failures', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = { algorithm: 'gzip' };
      const error = new Error('Package creation failed');

      // Mock package creation to throw an error
      vi.mocked(core.createPackage).mockRejectedValueOnce(error);

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to create package: Package creation failed');
    });

    it('should handle cases when package info is missing', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {
        algorithm: 'gzip'
      };

      // Setup mock for create package
      vi.mocked(core.createPackage).mockResolvedValueOnce({
        archivePath: '/path/to/archive.archive',
        compressedPath: '/path/to/archive.compressed',
        signaturePath: null
      });

      // Setup archiveInfo to return but packageInfo to be null
      vi.mocked(utils.getFileInfo)
        .mockReturnValueOnce({ // Archive info present
          size: 2048,
          formattedSize: '2 KB',
          extension: '.dsap',
          basename: 'archive.dsap',
          dirname: '/path/to'
        })
        .mockReturnValueOnce(null); // Package info missing

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      // Should not calculate or display compression ratio
      const infoCallArgs = vi.mocked(utils.info).mock.calls.map(call => call[0]);
      expect(infoCallArgs.some(arg => arg.includes('Compression ratio'))).toBe(false);
    });

    it('should handle unknown package creation errors', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = { algorithm: 'gzip' };

      // Mock package creation to throw a non-Error object
      vi.mocked(core.createPackage).mockRejectedValueOnce('Not an error object');

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to create package: Unknown error');
    });

    it('should handle validation failures for package command', async () => {
      // Arrange
      // Empty source path should fail validation
      const sourcePath = '';
      const outputPath = '/output/path';
      const options = { algorithm: 'gzip' };

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.createPackage).not.toHaveBeenCalled();
    });

    it('should handle path validation failures for package command', async () => {
      // Arrange
      const sourcePath = '/invalid/path';
      const outputPath = '/output/path';
      const options = { algorithm: 'gzip' };

      // Mock validatePath to fail
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handlePackage(sourcePath, outputPath, options);

      // Assert
      expect(core.createPackage).not.toHaveBeenCalled();
    });
  });
});