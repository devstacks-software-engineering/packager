import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks, mockSpinner } from './common.test.js';

// Setup mocks before importing modules
setupMocks();

// Import modules after mocks are configured
import { handleArchive, handleUnarchive } from '../../../src/cli/commands.js';
import * as utils from '../../../src/cli/utils.js';
import * as core from '../../../src/index.js';
import * as fs from 'node:fs';

describe('Archive Commands', () => {
  // Reset mocks before each test to ensure clean state
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock implementations for fs functions used in handlers
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
  });

  describe('handleArchive', () => {
    it('should archive a directory with include/exclude options', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {
        include: 'include1,include2',
        exclude: 'exclude1,exclude2'
      };

      // Act
      await handleArchive(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'directory');
      expect(core.archiveDirectory).toHaveBeenCalledWith(
        sourcePath,
        outputPath,
        {
          include: ['include1', 'include2'],
          exclude: ['exclude1', 'exclude2']
        }
      );
    });

    it('should handle archive creation failures', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {};
      const testError = new Error('Archive creation failed');

      // Mock archiveDirectory to throw an error
      vi.mocked(core.archiveDirectory).mockRejectedValueOnce(testError);

      // Act
      await handleArchive(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to create archive: Archive creation failed');
    });

    it('should handle unknown archive errors', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {};

      // Mock archiveDirectory to throw a non-Error object
      vi.mocked(core.archiveDirectory).mockRejectedValueOnce('Not an error object');

      // Act
      await handleArchive(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to create archive: Unknown error');
    });

    it('should handle path validation failures for archive', async () => {
      // Arrange
      const sourcePath = '/source/path';
      const outputPath = '/output/path';
      const options = {};

      // Mock validatePath to fail
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handleArchive(sourcePath, outputPath, options);

      // Assert
      expect(core.archiveDirectory).not.toHaveBeenCalled();
    });

    it('should handle validation failures for archive', async () => {
      // Arrange
      const sourcePath = ''; // Empty path should fail validation
      const outputPath = '/output/path';
      const options = {};

      // Act
      await handleArchive(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.archiveDirectory).not.toHaveBeenCalled();
    });
  });

  describe('handleUnarchive', () => {
    it('should extract an archive file to a directory', async () => {
      // Arrange
      const archivePath = '/source/path.dsap';
      const outputPath = '/output/directory';

      // Act
      await handleUnarchive(archivePath, outputPath);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(archivePath, 'file');
      expect(core.unarchiveFile).toHaveBeenCalledWith(archivePath, outputPath);
      expect(mockSpinner.succeed).toHaveBeenCalledWith(`Archive extracted to: ${outputPath}`);
    });

    it('should handle extraction failures', async () => {
      // Arrange
      const archivePath = '/source/path.dsap';
      const outputPath = '/output/directory';
      const testError = new Error('Extraction failed');

      // Mock unarchiveFile to throw an error
      vi.mocked(core.unarchiveFile).mockRejectedValueOnce(testError);

      // Act
      await handleUnarchive(archivePath, outputPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to extract archive: Extraction failed');
    });

    it('should handle unknown extraction errors', async () => {
      // Arrange
      const archivePath = '/source/path.dsap';
      const outputPath = '/output/directory';

      // Mock unarchiveFile to throw a non-Error object
      vi.mocked(core.unarchiveFile).mockRejectedValueOnce('Not an error object');

      // Act
      await handleUnarchive(archivePath, outputPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to extract archive: Unknown error');
    });

    it('should handle path validation failures for unarchive', async () => {
      // Arrange
      const archivePath = '/source/path.dsap';
      const outputPath = '/output/directory';

      // Mock validatePath to fail
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handleUnarchive(archivePath, outputPath);

      // Assert
      expect(core.unarchiveFile).not.toHaveBeenCalled();
    });

    it('should handle validation failures for unarchive', async () => {
      // Arrange
      const archivePath = ''; // Empty path should fail validation
      const outputPath = '/output/directory';

      // Act
      await handleUnarchive(archivePath, outputPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.unarchiveFile).not.toHaveBeenCalled();
    });
  });
});