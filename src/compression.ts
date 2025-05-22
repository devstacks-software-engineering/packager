import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { CompressionAlgorithm, CompressionOptions } from './types.js';
import { extensionToAlgorithm } from './utils.js';

/**
 * Detects compression algorithm based on file extension
 * @param filePath Path to the file
 * @returns Detected compression algorithm or null if not detected
 */
export function detectAlgorithmFromExtension(filePath: string): CompressionAlgorithm | null {
  const ext = path.extname(filePath).toLowerCase();
  return extensionToAlgorithm[ext] || null;
}

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Promisify zlib functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

/**
 * Compresses data using the specified algorithm
 * @param data Data to compress
 * @param options Compression options
 * @returns Compressed data
 */
export async function compressData(
  data: Buffer,
  options: CompressionOptions
): Promise<Buffer> {
  // Default compression level
  const level = options.level ?? 6;

  // Validate compression level based on algorithm
  if (level < 0 || level > (options.algorithm === CompressionAlgorithm.BROTLI ? 11 : 9)) {
    throw new RangeError(`Invalid compression level ${level}. Expected 0-9 (gzip) or 0-11 (brotli).`);
  }

  // Compress based on algorithm
  switch (options.algorithm) {
  case CompressionAlgorithm.GZIP:
    return await gzip(data, { level });
  case CompressionAlgorithm.BROTLI:
    return await brotliCompress(data, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: level,
      },
    });
  default:
    throw new Error(`Unsupported compression algorithm: ${options.algorithm}`);
  }
}

/**
 * Decompresses data using the appropriate algorithm based on file format detection
 * @param data Compressed data
 * @param algorithm Optional algorithm to use (if known)
 * @returns Decompressed data
 */
export async function decompressData(
  data: Buffer,
  algorithm?: CompressionAlgorithm
): Promise<Buffer> {
  // If algorithm is specified, use it
  if (algorithm) {
    switch (algorithm) {
    case CompressionAlgorithm.GZIP:
      return gunzip(data);
    case CompressionAlgorithm.BROTLI:
      return brotliDecompress(data);
    default:
      throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }
  }

  // Try to detect the format based on headers
  try {
    // Try GZIP first (most common)
    if (data[0] === 0x1F && data[1] === 0x8B) {
      return await gunzip(data);
    }

    // Try Brotli - no consistent header, but try it next
    try {
      return await brotliDecompress(data);
    } catch {
      // Brotli decompression failed
    }

    // Unable to detect compression format
    throw new Error('Unable to detect compression algorithm. Please specify the algorithm explicitly.');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Decompression failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Compresses a file
 * @param inputPath Path to the file to compress
 * @param outputPath Path to write the compressed file
 * @param options Compression options
 */
export async function compressFile(
  inputPath: string,
  outputPath: string,
  options: CompressionOptions
): Promise<void> {
  // Read input file
  const data = await readFile(inputPath);

  // Compress data
  const compressed = await compressData(data, options);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Write compressed data
  await writeFile(outputPath, compressed);
}

/**
 * Decompresses a file
 * @param inputPath Path to the compressed file
 * @param outputPath Path to write the decompressed file
 * @param algorithm Optional compression algorithm to use for decompression
 */
export async function decompressFile(
  inputPath: string,
  outputPath: string,
  algorithm?: CompressionAlgorithm
): Promise<void> {
  // Read compressed file
  const compressed = await readFile(inputPath);

  // If algorithm is not specified, try to detect from file extension
  if (!algorithm) {
    const detectedAlgorithm = detectAlgorithmFromExtension(inputPath);
    if (detectedAlgorithm) {
      algorithm = detectedAlgorithm;
    }
  }

  // Decompress data with detected or provided algorithm
  const decompressed = await decompressData(compressed, algorithm);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Write decompressed data
  await writeFile(outputPath, decompressed);
}