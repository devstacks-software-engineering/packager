import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks, mockSpinner } from './common.test.js';

// Setup mocks before importing modules
setupMocks();

// Import modules after mocks are configured
import { handleCompress } from '../../../src/cli/commands.js';
import * as utils from '../../../src/cli/utils.js';
import * as core from '../../../src/index.js';
import * as fs from 'node:fs';

describe('Compress Commands', () => {
  // Reset mocks before each test to ensure clean state
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-establish required default mocks
    vi.mocked(utils.validatePath).mockReturnValue(true);
    vi.mocked(utils.getFileInfo).mockReturnValue({
      size: 1024,
      formattedSize: '1 KB',
    } as any);
    // Default mock implementations for fs functions used in handlers
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
  });

  describe('handleCompress', () => {
    it('should compress a file with specified algorithm and level', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.gz';
      const options = {
        algorithm: 'brotli',
        level: '6'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);

      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(utils.getFileInfo)
        .mockReturnValueOnce({ size: 1024, formattedSize: '1KB', extension: '.txt', basename: 'path.txt', dirname: '/source' } as any)
        .mockReturnValueOnce({ size: 512, formattedSize: '512B', extension: '.gz', basename: 'path.gz', dirname: '/output' } as any);
      vi.mocked(core.getCompressionAlgorithm).mockReturnValueOnce(core.CompressionAlgorithm.BROTLI);

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'file');
      expect(core.getCompressionAlgorithm).toHaveBeenCalledWith('brotli');
      expect(core.compressFile).toHaveBeenCalledWith(
        sourcePath,
        outputPath,
        {
          algorithm: core.CompressionAlgorithm.BROTLI, // Expect the actual algorithm
          level: 6
        }
      );
    });

    it('should handle validation errors in compress command', async () => {
      // Arrange
      const sourcePath = '';  // Empty path should fail validation
      const outputPath = '/output/path.gz';
      const options = {
        level: '6'
      };

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.compressFile).not.toHaveBeenCalled();
    });

    it('should handle path validation failures for compress', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.gz';
      const options = {
        algorithm: 'gzip'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
      // Mock validatePath to fail for the source file
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'file'); // It's called before the check
      expect(core.compressFile).not.toHaveBeenCalled();
    });

    it('should use default GZIP algorithm when no algorithm is specified', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.gz';
      const options = {
        // No algorithm specified
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);

      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(utils.getFileInfo).mockReturnValueOnce({
        size: 1024,
        formattedSize: '1 KB',
        extension: '.txt',
        basename: 'file.txt',
        dirname: '/test'
      } as any);

      // Mock getFileInfo for the output file as well, needed for success message
      vi.mocked(utils.getFileInfo).mockReturnValueOnce({
        size: 512, // Example size
        formattedSize: '512 B',
        extension: '.gz',
        basename: 'file.gz',
        dirname: '/test'
      } as any);

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'file');
      expect(core.getCompressionAlgorithm).not.toHaveBeenCalled();
      expect(core.compressFile).toHaveBeenCalledWith(
        sourcePath,
        outputPath,
        {
          algorithm: core.CompressionAlgorithm.GZIP // Default
        }
      );
    });

    it('should handle missing source file info', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.gz';
      const options = {
        algorithm: 'gzip'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(utils.getFileInfo).mockReturnValueOnce(null);

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(`Failed to get source file info: ${sourcePath}`);
      expect(core.compressFile).not.toHaveBeenCalled();
    });

    it('should handle missing output file info', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.gz';
      const options = {
        algorithm: 'gzip'
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
      vi.mocked(utils.validatePath).mockReturnValue(true);

      // Mock getFileInfo to return valid info for source but null for output
      vi.mocked(utils.getFileInfo)
        .mockReturnValueOnce({
          size: 1024,
          formattedSize: '1 KB',
          extension: '.txt',
          basename: 'file.txt',
          dirname: '/test'
        } as any) // Source file
        .mockReturnValueOnce(null); // Output file

      // Mock compressFile to resolve successfully, so we reach the output info check
      vi.mocked(core.compressFile).mockResolvedValueOnce(undefined);

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to get output file info');
    });

    it('should archive and compress a directory', async () => {
      // Arrange
      const sourcePath = '/source/dir';
      const outputPath = '/output/path.gz';
      const options = {
        archive: true, // Indicate it's a directory to be archived first
        algorithm: 'brotli',
        include: 'inc1,inc2',
        exclude: 'ex1,ex2',
        level: '9'
      };
      const tempArchivePath = `${outputPath}.archive.tmp`;

      // Mock fs checks for a directory
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(utils.validatePath).mockReturnValueOnce(true);
      vi.mocked(utils.getFileInfo)
        .mockReturnValueOnce({ size: 2048, formattedSize: '2KB' } as any) // Temp archive
        .mockReturnValueOnce({ size: 512, formattedSize: '512B' } as any); // Final output

      // Mock getCompressionAlgorithm
      vi.mocked(core.getCompressionAlgorithm).mockReturnValueOnce(core.CompressionAlgorithm.BROTLI);
      // Mock archiveDirectory
      vi.mocked(core.archiveDirectory).mockResolvedValueOnce(undefined);
      // Mock compressFile
      vi.mocked(core.compressFile).mockResolvedValueOnce(undefined);
      // Mock unlinkSync for cleanup
      vi.mocked(fs.unlinkSync).mockResolvedValueOnce(undefined);

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'directory');
      expect(core.archiveDirectory).toHaveBeenCalledWith(
        sourcePath,
        tempArchivePath,
        { include: ['inc1', 'inc2'], exclude: ['ex1', 'ex2'] }
      );
      expect(core.getCompressionAlgorithm).toHaveBeenCalledWith('brotli');
      expect(core.compressFile).toHaveBeenCalledWith(
        tempArchivePath, // Compress the temp archive
        outputPath,
        { algorithm: core.CompressionAlgorithm.BROTLI, level: 9 }
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining('Directory archived and compressed'));
      expect(fs.unlinkSync).toHaveBeenCalledWith(tempArchivePath);
    });

    it('should handle failure during directory archiving in handleCompress', async () => {
      // Arrange
      const sourcePath = '/source/dir';
      const outputPath = '/output/path.gz';
      const options = { archive: true };
      const tempArchivePath = `${outputPath}.archive.tmp`;
      const archiveError = new Error('Archive failed');

      // Mock fs for directory
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(utils.validatePath).mockReturnValueOnce(true);
      // Mock archiveDirectory to fail
      vi.mocked(core.archiveDirectory).mockRejectedValueOnce(archiveError);
      // Mock existsSync for cleanup check
      vi.mocked(fs.existsSync).mockReturnValue(true); // Assume temp file exists for cleanup check

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(`Archive error: ${archiveError.message}`);
      expect(core.compressFile).not.toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledWith(tempArchivePath);
    });

    it('should handle unknown error during compression', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.gz';
      const options = { algorithm: 'gzip' };

      // Mocks for file path
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(utils.getFileInfo).mockReturnValue({ size: 1024 } as any);
      // Mock compressFile to reject with a non-Error
      vi.mocked(core.compressFile).mockRejectedValue('Unknown compression issue');

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to compress: Unknown error');
    });

    it('should handle unlink failure during archive error cleanup', async () => {
      // Arrange
      const sourcePath = '/source/dir';
      const outputPath = '/output/path.gz';
      const options = { archive: true };
      const tempArchivePath = `${outputPath}.archive.tmp`;
      const archiveError = new Error('Archive failed');
      const unlinkError = new Error('Cannot delete temp');

      // Mocks
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(core.archiveDirectory).mockRejectedValue(archiveError);
      // Mock unlinkSync to throw
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw unlinkError;
      });

      // Act
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(`Archive error: ${archiveError.message}`);
      expect(utils.warning).toHaveBeenCalledWith(`Failed to clean up temporary file: ${tempArchivePath}`);
    });

    it('should handle unlink failure during finally block cleanup', async () => {
      // Arrange
      const sourcePath = '/source/dir';
      const outputPath = '/output/path.gz';
      const options = { archive: true };
      const tempArchivePath = `${outputPath}.archive.tmp`;
      const compressError = new Error('Compress failed');
      const unlinkError = new Error('Cannot delete temp finally');

      // Mocks
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(utils.validatePath).mockReturnValue(true);
      vi.mocked(core.archiveDirectory).mockResolvedValue(undefined);
      vi.mocked(utils.getFileInfo).mockReturnValue({ size: 1024 } as any);
      vi.mocked(core.compressFile).mockRejectedValue(compressError);
      // Mock unlinkSync to throw
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw unlinkError;
      });

      // Act
      // We now expect handleCompress to resolve (not reject)
      // because the outer catch logs the error and returns.
      await handleCompress(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(`Failed to compress: ${compressError.message}`);
      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to compress archive');
      expect(utils.warning).toHaveBeenCalledWith(`Failed to clean up temporary file: ${tempArchivePath}`);
    });
  });
});