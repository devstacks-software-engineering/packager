#!/usr/bin/env node

/**
 * Main CLI entry point for the packager utility
 *
 * This file sets up the command-line interface using Commander.js
 * and defines all available commands with their options and arguments.
 */

import { program } from 'commander';
import {
  handleArchive,
  handleCompress,
  handleDecompress,
  handleSign,
  handleVerify,
  handleGenerateKeys,
  handleDerivePublicKey,
  handlePackage,
  handleUnarchive
} from './commands.js';

// Get package version
const version = '0.16.0'; // Hardcoded version since dynamic imports of package.json can be problematic

// Configure main CLI program
program
  .name('packager')
  .description('Archive, compress, and sign web applications for cross-platform deployment')
  .version(version);

/**
 * Archive command - Creates an archive from a directory
 * Preserves folder structure and metadata of files
 */
program
  .command('archive')
  .alias('a')
  .description('Create an archive from a directory')
  .argument('<source>', 'Source directory to archive')
  .argument('<output>', 'Output archive file path')
  .option('-i, --include <pattern>', 'Include file pattern (glob), comma-separated')
  .option('-e, --exclude <pattern>', 'Exclude file pattern (glob), comma-separated')
  .action(handleArchive);

/**
 * Compress command - Compresses a file or directory using the specified algorithm
 * Supports multiple compression algorithms with configurable compression levels
 */
program
  .command('compress')
  .alias('c')
  .description('Compress a file or directory')
  .argument('<source>', 'Source file or directory to compress')
  .argument('<output>', 'Output compressed file path')
  .option('-a, --algorithm <algorithm>', 'Compression algorithm (gzip, brotli, deflate)')
  .option('-l, --level <level>', 'Compression level (1-9)')
  .option('--archive', 'Archive the directory before compression if source is a directory')
  .option('-i, --include <pattern>', 'Include file pattern for archiving (glob), comma-separated')
  .option('-e, --exclude <pattern>', 'Exclude file pattern for archiving (glob), comma-separated')
  .action(handleCompress);

/**
 * Decompress command - Decompresses a previously compressed file
 * Automatically detects the compression algorithm used or allows explicit specification
 */
program
  .command('decompress')
  .alias('d')
  .description('Decompress a file')
  .argument('<source>', 'Source compressed file')
  .argument('<output>', 'Output decompressed file path or directory')
  .option('-a, --algorithm <algorithm>', 'Compression algorithm (gzip, brotli, deflate)')
  .option('--unarchive', 'Unarchive the decompressed file if it is an archive')
  .action(handleDecompress);

/**
 * Sign command - Signs a file using Ed25519 digital signature
 * Creates a detached signature file for verification
 */
program
  .command('sign')
  .alias('s')
  .description('Sign a file using Ed25519')
  .argument('<source>', 'Source file to sign')
  .argument('<output>', 'Output signature file path')
  .requiredOption('--privkey <path>', 'Path to the private key file')
  .action(handleSign);

/**
 * Verify command - Verifies a file against its signature
 * Ensures the file hasn't been tampered with since signing
 */
program
  .command('verify')
  .alias('v')
  .description('Verify a file signature using Ed25519')
  .argument('<file>', 'File to verify')
  .argument('<signature>', 'Signature file path')
  .requiredOption('--pubkey <path>', 'Path to the public key file')
  .action(handleVerify);

/**
 * Generate keys command - Creates a new Ed25519 key pair
 * Generates both private and public keys for signing and verification
 */
program
  .command('generate-keys')
  .alias('g')
  .description('Generate an Ed25519 key pair')
  .argument('<privateKey>', 'Path where the private key file will be saved (recommended: use .pem extension)')
  .argument('<publicKey>', 'Path where the public key file will be saved (recommended: use .pub extension)')
  .action(handleGenerateKeys);

/**
 * Derive public key command - Extracts a public key from a private key
 * Useful when you have the private key but need to regenerate the public key
 */
program
  .command('derive-public-key')
  .alias('p')
  .description('Derive a public key from a private key')
  .argument('<privateKey>', 'Private key file path')
  .argument('<publicKey>', 'Output public key file path')
  .action(handleDerivePublicKey);

/**
 * Package command - Combines archive, compress, and sign operations
 * Creates a complete deployable package in one operation
 * Produces two files: the compressed output file and its signature (if signing is enabled)
 */
program
  .command('package')
  .alias('pkg')
  .description('Archive, compress, and optionally sign a directory into a single file')
  .argument('<source>', 'Source directory to package')
  .argument('<output>', 'Output file path for the compressed file')
  .option('-a, --algorithm <algorithm>', 'Compression algorithm (gzip, brotli, deflate)')
  .option('--privkey <path>', 'Path to the private key file for signing')
  .action(handlePackage);

/**
 * Unarchive command - Extracts an archive file to a directory
 * Preserves the folder structure and metadata of files
 */
program
  .command('unarchive')
  .alias('u')
  .description('Extract an archive file to a directory')
  .argument('<archive>', 'Archive file to extract')
  .argument('<o>', 'Output directory path')
  .action(handleUnarchive);

/**
 * Process the provided command-line arguments
 * This must be called after all commands are defined
 */
program.parse();

/**
 * Default behavior when no command is specified
 * Shows the help information to guide the user
 */
if (process.argv.length <= 2) {
  program.help();
}