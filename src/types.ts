/**
 * Represents an entry in the archive
 */
export interface ArchiveEntry {
  /** Relative path from the root directory */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  mimeType: string;
  /** Raw file data */
  data: Buffer;
}

/**
 * Archive file structure
 */
export interface Archive {
  /** Archive format version */
  version: number;
  /** List of file entries */
  entries: ArchiveEntry[];
}

/**
 * Supported compression algorithms
 */
export enum CompressionAlgorithm {
  /** Good for builtin C#/.NET (Windows apps), for Python (Linux apps with GTK), Java/Kotlin (Android apps) in terms of compatibility */
  GZIP = 'gzip',
  /** Good for C#/.NET (Windows apps) in terms of compression ratio */
  BROTLI = 'brotli',
  /** Raw DEFLATE compression, widely compatible with most platforms, slightly less overhead than GZIP */
  DEFLATE = 'deflate',
}

/**
 * Options for creating an archive
 */
export interface ArchiveOptions {
  /** Include file pattern (glob) */
  include?: string[];
  /** Exclude file pattern (glob) */
  exclude?: string[];
}

/**
 * Options for compressing an archive
 */
export interface CompressionOptions {
  /** Compression algorithm to use */
  algorithm: CompressionAlgorithm;
  /** Compression level (1-9, higher is more compression) */
  level?: number;
}

/**
 * Options for signing a file
 */
export interface SignOptions {
  /** Path to the private key file */
  privateKeyPath?: string;
  /** Private key as Buffer */
  privateKey?: Buffer;
}

/**
 * Options for verifying a signature
 */
export interface VerifyOptions {
  /** Path to the public key file */
  publicKeyPath?: string;
  /** Public key as Buffer */
  publicKey?: Buffer;
}

/**
 * Options for generating a key pair
 */
export interface KeyPairOptions {
  /** Path to save the private key */
  privateKeyPath: string;
  /** Path to save the public key */
  publicKeyPath: string;
}