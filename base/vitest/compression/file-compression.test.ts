import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compressFile, decompressFile } from '../../src/compression.js';
import { CompressionAlgorithm } from '../../src/types.js';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rm);

describe('File Compression', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `packager-compression-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rmdir(tempDir, { recursive: true, force: true });
  });

  it('should compress and decompress a file', async () => {
    // Create test file
    const testContent = 'This is a test file with repeating content. '.repeat(100);
    const inputPath = path.join(tempDir, 'test-input.txt');
    const compressedPath = path.join(tempDir, 'test-compressed.bin');
    const outputPath = path.join(tempDir, 'test-output.txt');

    await writeFile(inputPath, testContent);

    // Compress file
    await compressFile(inputPath, compressedPath, {
      algorithm: CompressionAlgorithm.GZIP,
    });

    // Verify compressed file exists and is smaller
    expect(fs.existsSync(compressedPath)).toBe(true);

    const inputStats = fs.statSync(inputPath);
    const compressedStats = fs.statSync(compressedPath);

    // For large enough content, compressed should be smaller
    expect(compressedStats.size).toBeLessThan(inputStats.size);

    // Decompress file
    await decompressFile(compressedPath, outputPath);

    // Verify output file exists
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify content is the same
    const outputContent = await readFile(outputPath, 'utf8');
    expect(outputContent).toBe(testContent);
  });

  it.each([
    CompressionAlgorithm.GZIP,
    CompressionAlgorithm.BROTLI,
    CompressionAlgorithm.DEFLATE,
  ])('should work with %s algorithm', async (algorithm) => {
    // Create test file
    const testContent = 'Test content for compression';
    const inputPath = path.join(tempDir, `test-${algorithm}-input.txt`);
    const compressedPath = path.join(tempDir, `test-${algorithm}-compressed.bin`);
    const outputPath = path.join(tempDir, `test-${algorithm}-output.txt`);

    await writeFile(inputPath, testContent);

    // Compress file
    await compressFile(inputPath, compressedPath, { algorithm });

    // Decompress file with explicit algorithm (as auto-detection for DEFLATE is disabled)
    await decompressFile(compressedPath, outputPath, algorithm);

    // Verify content is the same
    const outputContent = await readFile(outputPath, 'utf8');
    expect(outputContent).toBe(testContent);
  });

  it('should handle binary files correctly', async () => {
    // Create binary file
    const binaryData = Buffer.alloc(1024);
    for (let i = 0; i < binaryData.length; i++) {
      binaryData[i] = i % 256;
    }

    const binaryPath = path.join(tempDir, 'binary.dat');
    const compressedPath = path.join(tempDir, 'binary.compressed');
    const outputPath = path.join(tempDir, 'binary.out');

    await writeFile(binaryPath, binaryData);

    // Compress and decompress
    await compressFile(binaryPath, compressedPath, { algorithm: CompressionAlgorithm.GZIP });
    await decompressFile(compressedPath, outputPath);

    // Verify binary content is preserved
    const outputData = await readFile(outputPath);
    expect(Buffer.compare(outputData, binaryData)).toBe(0);
  });

  it('should handle empty files correctly', async () => {
    const emptyPath = path.join(tempDir, 'empty.txt');
    const compressedPath = path.join(tempDir, 'empty.compressed');
    const outputPath = path.join(tempDir, 'empty.out');

    // Create empty file
    await writeFile(emptyPath, '');

    // Compress and decompress
    await compressFile(emptyPath, compressedPath, { algorithm: CompressionAlgorithm.BROTLI });
    await decompressFile(compressedPath, outputPath);

    // Verify output is also empty
    const outputContent = await readFile(outputPath, 'utf8');
    expect(outputContent).toBe('');
  });

  it('should create output directories if they do not exist', async () => {
    const testContent = 'Test content';
    const inputPath = path.join(tempDir, 'input.txt');
    const compressedPath = path.join(tempDir, 'nested/dir/compressed.bin');
    const outputPath = path.join(tempDir, 'another/nested/dir/output.txt');

    await writeFile(inputPath, testContent);

    // Compress to a nested directory that doesn't exist
    await compressFile(inputPath, compressedPath, { algorithm: CompressionAlgorithm.GZIP });

    // Verify the directory was created
    expect(fs.existsSync(path.dirname(compressedPath))).toBe(true);

    // Decompress to another nested directory
    await decompressFile(compressedPath, outputPath);

    // Verify the output directory was created
    expect(fs.existsSync(path.dirname(outputPath))).toBe(true);

    // Verify content
    const outputContent = await readFile(outputPath, 'utf8');
    expect(outputContent).toBe(testContent);
  });

  it('should throw error when input file does not exist', async () => {
    const nonExistentPath = path.join(tempDir, 'non-existent.txt');
    const outputPath = path.join(tempDir, 'output.bin');

    await expect(
      compressFile(nonExistentPath, outputPath, { algorithm: CompressionAlgorithm.GZIP })
    ).rejects.toThrow();
  });

  it('should throw error when decompressing a non-compressed file', async () => {
    // Create a regular text file
    const regularFilePath = path.join(tempDir, 'regular.txt');
    const outputPath = path.join(tempDir, 'output.txt');

    await writeFile(regularFilePath, 'This is not a compressed file');

    // Try to decompress it
    await expect(
      decompressFile(regularFilePath, outputPath)
    ).rejects.toThrow('Decompression failed');
  });

  it('should decompress with explicitly specified algorithm', async () => {
    // Create test file
    const testContent = 'Test content for explicit algorithm decompression';
    const inputPath = path.join(tempDir, 'explicit-algo-input.txt');
    const compressedPath = path.join(tempDir, 'explicit-algo.deflate');
    const outputPath = path.join(tempDir, 'explicit-algo-output.txt');

    await writeFile(inputPath, testContent);

    // Compress file with DEFLATE
    await compressFile(inputPath, compressedPath, {
      algorithm: CompressionAlgorithm.DEFLATE
    });

    // Decompress file with explicit algorithm
    await decompressFile(compressedPath, outputPath, CompressionAlgorithm.DEFLATE);

    // Verify content is the same
    const outputContent = await readFile(outputPath, 'utf8');
    expect(outputContent).toBe(testContent);
  });

  it('should detect algorithm from file extension', async () => {
    // Create test files for each algorithm
    const testContent = 'Test content for extension-based detection';
    const inputPath = path.join(tempDir, 'ext-detect-input.txt');
    const gzipPath = path.join(tempDir, 'ext-detect.gz');
    const brotliPath = path.join(tempDir, 'ext-detect.br');
    const deflatePath = path.join(tempDir, 'ext-detect.deflate');

    await writeFile(inputPath, testContent);

    // Compress with different algorithms
    await compressFile(inputPath, gzipPath, { algorithm: CompressionAlgorithm.GZIP });
    await compressFile(inputPath, brotliPath, { algorithm: CompressionAlgorithm.BROTLI });
    await compressFile(inputPath, deflatePath, { algorithm: CompressionAlgorithm.DEFLATE });

    // Decompress with auto-detection by extension
    const gzipOutput = path.join(tempDir, 'ext-detect-gzip-output.txt');
    const brotliOutput = path.join(tempDir, 'ext-detect-brotli-output.txt');
    const deflateOutput = path.join(tempDir, 'ext-detect-deflate-output.txt');

    await decompressFile(gzipPath, gzipOutput);
    await decompressFile(brotliPath, brotliOutput);
    await decompressFile(deflatePath, deflateOutput);

    // Verify content is the same for all
    const gzipContent = await readFile(gzipOutput, 'utf8');
    const brotliContent = await readFile(brotliOutput, 'utf8');
    const deflateContent = await readFile(deflateOutput, 'utf8');

    expect(gzipContent).toBe(testContent);
    expect(brotliContent).toBe(testContent);
    expect(deflateContent).toBe(testContent);
  });
});