import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPackage } from '../../src/utils.js';
import { CompressionAlgorithm } from '../../src/types.js';
import { generateKeyPair } from '../../src/crypto.js';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const rmdir = promisify(fs.rm);

describe('createPackage', () => {
  let tempDir: string;
  let sourceDir: string;
  let outputDir: string;

  beforeEach(async () => {
    // Create temporary directories
    tempDir = path.join(os.tmpdir(), `packager-package-test-${Date.now()}`);
    sourceDir = path.join(tempDir, 'source');
    outputDir = path.join(tempDir, 'output');

    await mkdir(tempDir, { recursive: true });
    await mkdir(sourceDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    // Create some test files
    await mkdir(path.join(sourceDir, 'subdir'), { recursive: true });
    await writeFile(path.join(sourceDir, 'file1.txt'), 'Content of file 1');
    await writeFile(path.join(sourceDir, 'file2.json'), '{"key":"value"}');
    await writeFile(path.join(sourceDir, 'subdir', 'file3.txt'), 'Content of file 3');
  });

  afterEach(async () => {
    // Clean up temporary directories
    await rmdir(tempDir, { recursive: true, force: true });
  });

  it('should create a package without signing', async () => {
    const outputPath = path.join(outputDir, 'test-package');

    const result = await createPackage(
      sourceDir,
      outputPath,
      CompressionAlgorithm.GZIP
    );

    // Verify result paths
    expect(result.archivePath).toBe(`${outputPath}.archive`);
    expect(result.compressedPath).toBe(`${outputPath}.gz`);
    expect(result.signaturePath).toBeNull();

    // Verify files exist
    expect(fs.existsSync(result.archivePath)).toBe(true);
    expect(fs.existsSync(result.compressedPath)).toBe(true);
  });

  it('should create a signed package', async () => {
    const outputPath = path.join(outputDir, 'test-signed-package');

    // Generate key pair
    const { privateKey } = generateKeyPair();

    const result = await createPackage(
      sourceDir,
      outputPath,
      CompressionAlgorithm.GZIP,
      { privateKey }
    );

    // Verify result paths
    expect(result.archivePath).toBe(`${outputPath}.archive`);
    expect(result.compressedPath).toBe(`${outputPath}.gz`);
    expect(result.signaturePath).toBe(`${outputPath}.gz.sig`);

    // Verify files exist
    expect(fs.existsSync(result.archivePath)).toBe(true);
    expect(fs.existsSync(result.compressedPath)).toBe(true);
    expect(fs.existsSync(result.signaturePath as string)).toBe(true);
  });

  it('should use default compression algorithm when not specified', async () => {
    const outputPath = path.join(outputDir, 'test-default-algorithm-package');

    // Create package without specifying the compression algorithm
    const result = await createPackage(
      sourceDir,
      outputPath
      // No compression algorithm specified here - should use default GZIP
    );

    // Verify result paths
    expect(result.archivePath).toBe(`${outputPath}.archive`);
    expect(result.compressedPath).toBe(`${outputPath}.gz`);
    expect(result.signaturePath).toBeNull();

    // Verify files exist
    expect(fs.existsSync(result.archivePath)).toBe(true);
    expect(fs.existsSync(result.compressedPath)).toBe(true);
  });

  it('should work with all compression algorithms', async () => {
    // Test with all supported algorithms
    for (const algorithm of [
      CompressionAlgorithm.GZIP,
      CompressionAlgorithm.BROTLI
    ]) {
      const outputPath = path.join(outputDir, `test-${algorithm}-package`);

      const result = await createPackage(
        sourceDir,
        outputPath,
        algorithm
      );

      // Verify files exist
      expect(fs.existsSync(result.archivePath)).toBe(true);
      expect(fs.existsSync(result.compressedPath)).toBe(true);
    }
  });

  it('should create necessary output directories if they do not exist', async () => {
    const nestedOutputPath = path.join(outputDir, 'nested/dir/package');

    // Directory shouldn't exist yet
    expect(fs.existsSync(path.dirname(nestedOutputPath))).toBe(false);

    const result = await createPackage(
      sourceDir,
      nestedOutputPath,
      CompressionAlgorithm.GZIP
    );

    // Verify directory was created and files exist
    expect(fs.existsSync(path.dirname(nestedOutputPath))).toBe(true);
    expect(fs.existsSync(result.archivePath)).toBe(true);
    expect(fs.existsSync(result.compressedPath)).toBe(true);
  });

  it('should sign with a key from a file path', async () => {
    const outputPath = path.join(outputDir, 'test-key-file-package');
    const keyPath = path.join(outputDir, 'private.key');

    // Generate and save key pair
    const { privateKey } = generateKeyPair();
    await writeFile(keyPath, privateKey);

    const result = await createPackage(
      sourceDir,
      outputPath,
      CompressionAlgorithm.GZIP,
      { privateKeyPath: keyPath }
    );

    // Verify signature was created
    expect(result.signaturePath).toBe(`${outputPath}.gz.sig`);
    expect(fs.existsSync(result.signaturePath as string)).toBe(true);
  });

  it('should throw error when source directory does not exist', async () => {
    const nonExistentDir = path.join(tempDir, 'non-existent');
    const outputPath = path.join(outputDir, 'test-error-package');

    await expect(
      createPackage(nonExistentDir, outputPath)
    ).rejects.toThrow();
  });
});