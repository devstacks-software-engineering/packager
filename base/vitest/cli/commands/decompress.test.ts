import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks, mockSpinner, path } from './common.test.js';

// Setup mocks before importing modules
setupMocks();

// Import modules after mocks are configured
import { handleDecompress } from '../../../src/cli/commands.js';
import * as utils from '../../../src/cli/utils.js';
import * as core from '../../../src/index.js';
import * as fs from 'node:fs';

describe('Decompress Commands', () => {
  // Reset mocks before each test to ensure clean state
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock implementations for fs functions used in handlers
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
  });

  describe('handleDecompress', () => {
    it('should decompress a file', async () => {
      // Arrange
      const sourcePath = '/source/path.gz';
      const outputPath = '/output/path.txt';
      const options = {};

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'file');
      expect(core.decompressFile).toHaveBeenCalledWith(sourcePath, outputPath, undefined);
    });

    it('should handle decompression failures', async () => {
      // Arrange
      const sourcePath = '/source/path.gz';
      const outputPath = '/output/path.txt';
      const options = {};
      const testError = new Error('Decompression failed');

      // Mock decompressFile to throw an error
      vi.mocked(core.decompressFile).mockRejectedValueOnce(testError);
      // Mock validatePath to return true
      vi.mocked(utils.validatePath).mockReturnValue(true);

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to process file: Decompression failed');
    });

    it('should handle unknown decompression errors', async () => {
      // Arrange
      const sourcePath = '/source/path.gz';
      const outputPath = '/output/path.txt';
      const options = {};
      // Mock validatePath to return true
      vi.mocked(utils.validatePath).mockReturnValue(true);

      // Mock decompressFile to throw a non-Error object
      vi.mocked(core.decompressFile).mockRejectedValueOnce('Not an error object');

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to process file: Unknown error');
    });

    it('should handle path validation failures for decompress', async () => {
      // Arrange
      const sourcePath = '/source/path.gz';
      const outputPath = '/output/path.txt';
      const options = {};

      // Mock validatePath to fail
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(core.decompressFile).not.toHaveBeenCalled();
    });

    it('should handle validation failures for decompress', async () => {
      // Arrange
      const sourcePath = ''; // Empty path should fail validation
      const outputPath = '/output/path.txt';
      const options = {};

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.decompressFile).not.toHaveBeenCalled();
    });

    it('should decompress and unarchive a file', async () => {
      // Arrange
      const sourcePath = '/source/path.tgz'; // Example archive format
      const outputPath = '/output/dir';
      const options = { unarchive: true }; // Indicate unarchiving needed
      const tempDecompressedPath = `${outputPath}.decompressed.tmp`;

      // Mock validatePath for source file
      vi.mocked(utils.validatePath).mockReturnValueOnce(true);
      // Mock decompressFile
      vi.mocked(core.decompressFile).mockResolvedValueOnce(undefined);
      // Mock fs.promises.mkdir
      vi.mocked(fs.promises.mkdir).mockResolvedValueOnce(undefined);
      // Mock unarchiveFile
      vi.mocked(core.unarchiveFile).mockResolvedValueOnce(undefined);
      // Mock existsSync for cleanup check
      vi.mocked(fs.existsSync).mockReturnValue(true);
      // Mock unlinkSync for cleanup
      vi.mocked(fs.unlinkSync).mockResolvedValueOnce(undefined);

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'file');
      expect(core.decompressFile).toHaveBeenCalledWith(sourcePath, tempDecompressedPath, undefined);
      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(outputPath), { recursive: true });
      expect(core.unarchiveFile).toHaveBeenCalledWith(tempDecompressedPath, outputPath);
      // Check success message for unarchive
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('File decompressed and extracted'));
      // Check temp file cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith(tempDecompressedPath);
    });

    it('should handle unarchive failure (not an archive)', async () => {
      // Arrange
      const sourcePath = '/source/path.gz'; // A compressed file, but not an archive
      const outputPath = '/output/file.txt';
      const options = { unarchive: true };
      const tempDecompressedPath = `${outputPath}.decompressed.tmp`;
      const unarchiveError = new Error('Invalid archive format');

      // Mocks
      vi.mocked(utils.validatePath).mockReturnValueOnce(true);
      vi.mocked(core.decompressFile).mockResolvedValueOnce(undefined);
      vi.mocked(fs.promises.mkdir).mockResolvedValueOnce(undefined);
      // Mock unarchiveFile to fail
      vi.mocked(core.unarchiveFile).mockRejectedValueOnce(unarchiveError);
      // Mock copyFile for fallback
      vi.mocked(fs.promises.copyFile).mockResolvedValueOnce(undefined);
      vi.mocked(fs.existsSync).mockReturnValue(true); // For cleanup check
      vi.mocked(fs.unlinkSync).mockResolvedValueOnce(undefined);

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(core.decompressFile).toHaveBeenCalledWith(sourcePath, tempDecompressedPath, undefined);
      expect(core.unarchiveFile).toHaveBeenCalledWith(tempDecompressedPath, outputPath);
      expect(utils.warning).toHaveBeenCalledWith('The decompressed file is not a valid archive. Saving as regular file.');
      // Check that it fell back to copying the file
      expect(fs.promises.copyFile).toHaveBeenCalledWith(tempDecompressedPath, outputPath);
      // Check spinner success message - it uses the "extracted" variant even on fallback
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('File decompressed and extracted to:'));
      expect(fs.unlinkSync).toHaveBeenCalledWith(tempDecompressedPath);
    });

    it('should handle generic unarchive failure', async () => {
      // Arrange
      const sourcePath = '/source/path.tgz';
      const outputPath = '/output/dir';
      const options = { unarchive: true };
      const tempDecompressedPath = `${outputPath}.decompressed.tmp`;
      const unarchiveError = new Error('Some other extraction error');

      // Mocks
      vi.mocked(utils.validatePath).mockReturnValueOnce(true);
      vi.mocked(core.decompressFile).mockResolvedValueOnce(undefined);
      vi.mocked(fs.promises.mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(core.unarchiveFile).mockRejectedValueOnce(unarchiveError);
      vi.mocked(fs.existsSync).mockReturnValue(true); // For cleanup check
      vi.mocked(fs.unlinkSync).mockResolvedValueOnce(undefined);

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(core.decompressFile).toHaveBeenCalledWith(sourcePath, tempDecompressedPath, undefined);
      expect(core.unarchiveFile).toHaveBeenCalledWith(tempDecompressedPath, outputPath);
      // Check overall process failure
      expect(mockSpinner.fail).toHaveBeenCalledWith('Processing failed');
      // Check specific error logged
      expect(utils.error).toHaveBeenCalledWith(`Failed to process file: ${unarchiveError.message}`);
      expect(fs.unlinkSync).toHaveBeenCalledWith(tempDecompressedPath);
    });

    it('should handle unknown error during decompression', async () => {
      // Arrange
      const sourcePath = '/source/path.gz';
      const outputPath = '/output/path.txt';
      const options = {};

      // Mocks
      vi.mocked(utils.validatePath).mockReturnValue(true);
      // Mock decompressFile to reject with non-Error
      vi.mocked(core.decompressFile).mockRejectedValue('Unknown decompression issue');

      // Act
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to process file: Unknown error');
    });

    it('should handle unlink failure during finally block cleanup in decompress/unarchive', async () => {
      // Arrange
      const sourcePath = '/source/path.tgz';
      const outputPath = '/output/dir';
      const options = { unarchive: true };
      const tempDecompressedPath = `${outputPath}.decompressed.tmp`;
      const unarchiveError = new Error('Extraction failed');
      const unlinkError = new Error('Cannot delete temp finally');

      // Mocks
      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(core.decompressFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(core.unarchiveFile).mockRejectedValue(unarchiveError);
      vi.mocked(fs.existsSync).mockReturnValue(true); // For cleanup check
      // Mock unlinkSync to throw
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw unlinkError;
      });

      // Act
      // We now expect handleDecompress to resolve (not reject)
      // as the outer catch handles the error.
      await handleDecompress(sourcePath, outputPath, options);

      // Assert
      // The error from unarchiveFile will be caught by the outer catch
      expect(utils.error).toHaveBeenCalledWith(`Failed to process file: ${unarchiveError.message}`);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Processing failed'); // From inner catch
      expect(utils.warning).toHaveBeenCalledWith(`Failed to clean up temporary file: ${tempDecompressedPath}`);
    });
  });
});