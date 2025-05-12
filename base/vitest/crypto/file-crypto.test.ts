import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateAndSaveKeyPair,
  deriveAndSavePublicKey,
  signFile,
  verifyFile,
  generateKeyPair
} from '../../src/crypto.js';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rm);

describe('File Crypto Operations', () => {
  let tempDir: string;
  let privateKeyPath: string;
  let publicKeyPath: string;
  let testFilePath: string;
  let signaturePath: string;

  beforeEach(async () => {
    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `packager-crypto-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    // Set file paths
    privateKeyPath = path.join(tempDir, 'private.key');
    publicKeyPath = path.join(tempDir, 'public.key');
    testFilePath = path.join(tempDir, 'test.txt');
    signaturePath = path.join(tempDir, 'test.sig');

    // Create test file
    await writeFile(testFilePath, 'This is a test file for cryptographic operations');
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rmdir(tempDir, { recursive: true, force: true });
  });

  it('should generate and save key pair', async () => {
    await generateAndSaveKeyPair({
      privateKeyPath,
      publicKeyPath,
    });

    // Verify files exist
    expect(fs.existsSync(privateKeyPath)).toBe(true);
    expect(fs.existsSync(publicKeyPath)).toBe(true);

    // Verify file contents
    const privateKey = await readFile(privateKeyPath);
    const publicKey = await readFile(publicKeyPath);

    // Ed25519 key sizes
    expect(privateKey.length).toBe(64); // 64 bytes (512 bits)
    expect(publicKey.length).toBe(32);  // 32 bytes (256 bits)
  });

  it('should create output directories if they do not exist', async () => {
    const nestedPrivatePath = path.join(tempDir, 'nested/keys/private.key');
    const nestedPublicPath = path.join(tempDir, 'other/nested/keys/public.key');

    // Directories shouldn't exist yet
    expect(fs.existsSync(path.dirname(nestedPrivatePath))).toBe(false);
    expect(fs.existsSync(path.dirname(nestedPublicPath))).toBe(false);

    await generateAndSaveKeyPair({
      privateKeyPath: nestedPrivatePath,
      publicKeyPath: nestedPublicPath,
    });

    // Verify directories were created
    expect(fs.existsSync(path.dirname(nestedPrivatePath))).toBe(true);
    expect(fs.existsSync(path.dirname(nestedPublicPath))).toBe(true);

    // Verify files exist
    expect(fs.existsSync(nestedPrivatePath)).toBe(true);
    expect(fs.existsSync(nestedPublicPath)).toBe(true);
  });

  it('should derive and save public key from private key', async () => {
    // Generate key pair
    await generateAndSaveKeyPair({
      privateKeyPath,
      publicKeyPath,
    });

    // Create a new path for the derived public key
    const derivedPublicKeyPath = path.join(tempDir, 'derived-public.key');

    // Derive and save public key
    await deriveAndSavePublicKey(privateKeyPath, derivedPublicKeyPath);

    // Verify file exists
    expect(fs.existsSync(derivedPublicKeyPath)).toBe(true);

    // Compare public keys
    const originalPublicKey = await readFile(publicKeyPath);
    const derivedPublicKey = await readFile(derivedPublicKeyPath);

    // Both public keys should be identical
    expect(Buffer.compare(originalPublicKey, derivedPublicKey)).toBe(0);
  });

  it('should derive public key to a nested directory', async () => {
    // Generate key pair
    await generateAndSaveKeyPair({
      privateKeyPath,
      publicKeyPath,
    });

    // Create a nested path
    const nestedPublicKeyPath = path.join(tempDir, 'nested/derived/public.key');

    // Verify directory doesn't exist yet
    expect(fs.existsSync(path.dirname(nestedPublicKeyPath))).toBe(false);

    // Derive and save public key
    await deriveAndSavePublicKey(privateKeyPath, nestedPublicKeyPath);

    // Verify directory was created
    expect(fs.existsSync(path.dirname(nestedPublicKeyPath))).toBe(true);

    // Verify file exists
    expect(fs.existsSync(nestedPublicKeyPath)).toBe(true);
  });

  it('should sign and verify a file', async () => {
    // Generate key pair
    await generateAndSaveKeyPair({
      privateKeyPath,
      publicKeyPath,
    });

    // Sign file
    await signFile(testFilePath, signaturePath, {
      privateKeyPath,
    });

    // Verify file exists
    expect(fs.existsSync(signaturePath)).toBe(true);

    // Verify signature
    const isValid = await verifyFile(testFilePath, signaturePath, {
      publicKeyPath,
    });

    expect(isValid).toBe(true);
  });

  it('should sign file with Buffer key instead of path', async () => {
    // Generate key pair in memory
    const { privateKey, publicKey } = generateKeyPair();

    // Sign file with in-memory key
    await signFile(testFilePath, signaturePath, { privateKey });

    // Verify file exists
    expect(fs.existsSync(signaturePath)).toBe(true);

    // Verify signature with in-memory key
    const isValid = await verifyFile(testFilePath, signaturePath, { publicKey });
    expect(isValid).toBe(true);
  });

  it('should detect tampered file', async () => {
    // Generate key pair
    await generateAndSaveKeyPair({
      privateKeyPath,
      publicKeyPath,
    });

    // Sign file
    await signFile(testFilePath, signaturePath, {
      privateKeyPath,
    });

    // Modify file
    await writeFile(testFilePath, 'This file has been tampered with');

    // Verify signature
    const isValid = await verifyFile(testFilePath, signaturePath, {
      publicKeyPath,
    });

    expect(isValid).toBe(false);
  });

  it('should throw error when signing without private key', async () => {
    await expect(
      signFile(testFilePath, signaturePath, {})
    ).rejects.toThrow('Private key or path to private key file is required');
  });

  it('should throw error when verifying without public key', async () => {
    // Create a dummy signature first
    await writeFile(signaturePath, Buffer.alloc(64));

    await expect(
      verifyFile(testFilePath, signaturePath, {})
    ).rejects.toThrow('Public key or path to public key file is required');
  });

  it('should handle empty files', async () => {
    // Create empty file
    const emptyFilePath = path.join(tempDir, 'empty.txt');
    await writeFile(emptyFilePath, '');

    // Generate key pair
    const { privateKey, publicKey } = generateKeyPair();

    // Sign empty file
    await signFile(emptyFilePath, signaturePath, { privateKey });

    // Verify signature
    const isValid = await verifyFile(emptyFilePath, signaturePath, { publicKey });
    expect(isValid).toBe(true);
  });

  it('should sign and verify to/from nested directories', async () => {
    // Create nested paths
    const nestedSignaturePath = path.join(tempDir, 'nested/sigs/file.sig');

    // Generate key pair
    const { privateKey, publicKey } = generateKeyPair();

    // Sign file to nested path
    await signFile(testFilePath, nestedSignaturePath, { privateKey });

    // Verify directory was created
    expect(fs.existsSync(path.dirname(nestedSignaturePath))).toBe(true);

    // Verify signature
    const isValid = await verifyFile(testFilePath, nestedSignaturePath, { publicKey });
    expect(isValid).toBe(true);
  });
});