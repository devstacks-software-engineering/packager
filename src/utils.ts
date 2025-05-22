import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { CompressionAlgorithm, CompressionOptions, SignOptions } from './types.js';
import { archiveDirectory } from './archive.js';
import { compressFile } from './compression.js';
import { signFile } from './crypto.js';

/**
 * Maps compression algorithms to file extensions
 */
export const algorithmToExtension: Record<CompressionAlgorithm, string> = {
  [CompressionAlgorithm.GZIP]: '.gz',
  [CompressionAlgorithm.BROTLI]: '.br',
};

/**
 * Maps file extensions to compression algorithms
 */
export const extensionToAlgorithm: Record<string, CompressionAlgorithm> = {
  '.gz': CompressionAlgorithm.GZIP,
  '.gzip': CompressionAlgorithm.GZIP,
  '.br': CompressionAlgorithm.BROTLI,
  '.brotli': CompressionAlgorithm.BROTLI,
};

const mkdir = promisify(fs.mkdir);

/**
 * Creates a full packaged archive (archive + compress + sign)
 * @param sourcePath Absolute path to the directory to archive
 * @param outputPath Path to write the output
 * @param compressionAlgorithm Compression algorithm to use
 * @param signOptions Signing options
 */
export async function createPackage(
  sourcePath: string,
  outputPath: string,
  compressionAlgorithm: CompressionAlgorithm = CompressionAlgorithm.GZIP,
  signOptions: SignOptions | null = null
): Promise<{ archivePath: string; compressedPath: string; signaturePath: string | null }> {
  // Create output directories
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // File paths
  const archivePath = `${outputPath}.archive`;
  const compressedPath = `${outputPath}${algorithmToExtension[compressionAlgorithm]}`;
  const signaturePath = signOptions ? `${compressedPath}.sig` : null;

  // Step 1: Create archive
  await archiveDirectory(sourcePath, archivePath);

  // Step 2: Compress archive
  const compressionOptions: CompressionOptions = {
    algorithm: compressionAlgorithm,
  };

  await compressFile(archivePath, compressedPath, compressionOptions);

  // Step 3: Sign compressed archive (if needed)
  if (signOptions && signaturePath) {
    await signFile(compressedPath, signaturePath, signOptions);
  }

  return {
    archivePath,
    compressedPath,
    signaturePath,
  };
}

/**
 * Formats a file size in a human-readable format
 * @param bytes File size in bytes
 * @returns Formatted file size (e.g., "1.23 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Gets compression algorithm enum from string
 * @param algorithm Algorithm name
 * @returns CompressionAlgorithm enum value
 */
export function getCompressionAlgorithm(algorithm: string): CompressionAlgorithm {
  const normalized = algorithm.toLowerCase();

  switch (normalized) {
  case 'gzip':
    return CompressionAlgorithm.GZIP;
  case 'brotli':
    return CompressionAlgorithm.BROTLI;
  default:
    throw new Error(`Unsupported compression algorithm: ${algorithm}`);
  }
}