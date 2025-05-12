import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import nacl from 'tweetnacl';
import { SignOptions, VerifyOptions, KeyPairOptions } from './types.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Generates an Ed25519 key pair
 * @returns Key pair (public and private keys)
 */
export function generateKeyPair(): {
  publicKey: Buffer;
  privateKey: Buffer;
  } {
  // Generate key pair
  const keyPair = nacl.sign.keyPair();

  // Convert to Buffer
  const publicKey = Buffer.from(keyPair.publicKey);
  const privateKey = Buffer.from(keyPair.secretKey);

  return {
    publicKey,
    privateKey,
  };
}

/**
 * Derives a public key from a private key
 * @param privateKey Private key
 * @returns Public key
 */
export function derivePublicKey(privateKey: Buffer): Buffer {
  // Extract public key from private key
  const keyPair = nacl.sign.keyPair.fromSecretKey(privateKey);
  return Buffer.from(keyPair.publicKey);
}

/**
 * Signs data using Ed25519
 * @param data Data to sign
 * @param options Signing options
 * @returns Signature
 */
export async function signData(
  data: Buffer,
  options: SignOptions
): Promise<Buffer> {
  let privateKey: Buffer;

  // Get private key from options
  if (options.privateKey) {
    privateKey = options.privateKey;
  } else if (options.privateKeyPath) {
    privateKey = await readFile(options.privateKeyPath);
  } else {
    throw new Error('Private key or path to private key file is required');
  }

  // Sign data
  const signature = nacl.sign.detached(data, privateKey);

  return Buffer.from(signature);
}

/**
 * Verifies a signature using Ed25519
 * @param data Data that was signed
 * @param signature Signature to verify
 * @param options Verification options
 * @returns Whether the signature is valid
 */
export async function verifyData(
  data: Buffer,
  signature: Buffer,
  options: VerifyOptions
): Promise<boolean> {
  let publicKey: Buffer;

  // Get public key from options
  if (options.publicKey) {
    publicKey = options.publicKey;
  } else if (options.publicKeyPath) {
    publicKey = await readFile(options.publicKeyPath);
  } else {
    throw new Error('Public key or path to public key file is required');
  }

  // Verify signature
  return nacl.sign.detached.verify(data, signature, publicKey);
}

/**
 * Signs a file using Ed25519
 * @param filePath Path to the file to sign
 * @param signaturePath Path to write the signature
 * @param options Signing options
 */
export async function signFile(
  filePath: string,
  signaturePath: string,
  options: SignOptions
): Promise<void> {
  // Read file
  const data = await readFile(filePath);

  // Sign data
  const signature = await signData(data, options);

  // Ensure signature directory exists
  const signatureDir = path.dirname(signaturePath);
  await mkdir(signatureDir, { recursive: true });

  // Write signature
  await writeFile(signaturePath, signature);
}

/**
 * Verifies a file signature using Ed25519
 * @param filePath Path to the file
 * @param signaturePath Path to the signature
 * @param options Verification options
 * @returns Whether the signature is valid
 */
export async function verifyFile(
  filePath: string,
  signaturePath: string,
  options: VerifyOptions
): Promise<boolean> {
  // Read file
  const data = await readFile(filePath);

  // Read signature
  const signature = await readFile(signaturePath);

  // Verify signature
  return verifyData(data, signature, options);
}

/**
 * Generates an Ed25519 key pair and saves it to files
 * @param options Key pair options
 */
export async function generateAndSaveKeyPair(
  options: KeyPairOptions
): Promise<void> {
  // Generate key pair
  const { publicKey, privateKey } = generateKeyPair();

  // Ensure directories exist
  const privateKeyDir = path.dirname(options.privateKeyPath);
  const publicKeyDir = path.dirname(options.publicKeyPath);

  await mkdir(privateKeyDir, { recursive: true });
  await mkdir(publicKeyDir, { recursive: true });

  // Write keys
  await writeFile(options.privateKeyPath, privateKey);
  await writeFile(options.publicKeyPath, publicKey);
}

/**
 * Derives a public key from a private key and saves it to a file
 * @param privateKeyPath Path to the private key
 * @param publicKeyPath Path to save the public key
 */
export async function deriveAndSavePublicKey(
  privateKeyPath: string,
  publicKeyPath: string
): Promise<void> {
  // Read private key
  const privateKey = await readFile(privateKeyPath);

  // Derive public key
  const publicKey = derivePublicKey(privateKey);

  // Ensure directory exists
  const publicKeyDir = path.dirname(publicKeyPath);
  await mkdir(publicKeyDir, { recursive: true });

  // Write public key
  await writeFile(publicKeyPath, publicKey);
}