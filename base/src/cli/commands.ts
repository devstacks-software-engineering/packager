import fs from 'node:fs';
import path from 'node:path';
import { error, info, warning, createSpinner, validatePath, getFileInfo } from './utils.js';
import { z } from 'zod';

export interface Options {
  include?: string;
  exclude?: string;
  algorithm?: string;
  privkey?: string;
  pubkey?: string;
  clean?: boolean;
  level?: string;
  [key: string]: unknown;
}

import {
  archiveDirectory,
  compressFile,
  decompressFile,
  signFile,
  verifyFile,
  generateAndSaveKeyPair,
  deriveAndSavePublicKey,
  createPackage,
  getCompressionAlgorithm,
  CompressionAlgorithm,
  unarchiveFile,
} from '../index.js';

/**
 * Zod validation schemas for command parameters
 */
const PathSchema = z.string().min(1, 'Path must not be empty');

const OptionsSchema = z.object({
  include: z.string().optional(),
  exclude: z.string().optional(),
  algorithm: z.string().optional(),
  privkey: z.string().optional(),
  pubkey: z.string().optional(),
  clean: z.boolean().optional(),
  level: z.string().regex(/^[1-9]$/, 'Compression level must be between 1-9').optional(),
  archive: z.boolean().optional()
}).strict().catchall(z.unknown());

const ArchiveOptionsSchema = OptionsSchema.pick({
  include: true,
  exclude: true
});

const CompressOptionsSchema = OptionsSchema.pick({
  algorithm: true,
  level: true,
  archive: true
});

const SignOptionsSchema = OptionsSchema.pick({
  privkey: true
}).extend({
  privkey: z.string({
    required_error: 'Private key path is required',
    invalid_type_error: 'Private key path is required'
  }).min(1, 'Private key path is required')
});

const VerifyOptionsSchema = OptionsSchema.pick({
  pubkey: true
}).extend({
  pubkey: z.string({
    required_error: 'Public key path is required',
    invalid_type_error: 'Public key path is required'
  }).min(1, 'Public key path is required')
});

const PackageOptionsSchema = OptionsSchema.pick({
  algorithm: true,
  privkey: true
});

/**
 * Helper function to validate parameters with zod schemas
 * Returns true if validation passes, false if it fails
 */
function validateParams<T extends z.ZodTypeAny[]>(schemas: T, values: unknown[]): boolean {
  try {
    // Validate each value with its corresponding schema
    for (let i = 0; i < schemas.length; i++) {
      schemas[i].parse(values[i]);
    }
    return true;
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      error(`Validation error: ${validationError.errors.map(e => e.message).join(', ')}`);
    }
    return false;
  }
}

/**
 * Archive command handler
 */
export async function handleArchive(sourcePath: string, outputPath: string, options: Options): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema, ArchiveOptionsSchema],
    [sourcePath, outputPath, options]
  )) {
    return;
  }
  try {
    // Validate source path
    if (!validatePath(sourcePath, 'directory')) {
      return;
    }

    // Show spinner
    const spinner = createSpinner('Creating archive...');
    spinner.start();

    // Archive directory
    const archiveOptions: Record<string, string[]> = {};
    if (options.include) archiveOptions.include = options.include.split(',');
    if (options.exclude) archiveOptions.exclude = options.exclude.split(',');
    await archiveDirectory(sourcePath, outputPath, Object.keys(archiveOptions).length ? archiveOptions : {});

    // Get file info
    const fileInfo = getFileInfo(outputPath);

    // Show success message
    spinner.succeed(`Archive created: ${outputPath} (${fileInfo?.formattedSize})`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to create archive: ${err.message}`);
    } else {
      error('Failed to create archive: Unknown error');
    }
  }
}

/**
 * Compress command handler
 */
export async function handleCompress(sourcePath: string, outputPath: string, options: Options): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema, CompressOptionsSchema],
    [sourcePath, outputPath, options]
  )) {
    return;
  }
  try {
    // Create a temp path for the archive if needed
    let fileToCompress = sourcePath;
    let tempPath: string | null = null;

    // Check if source is a directory and --archive option is set
    const isDirectory = fs.existsSync(sourcePath) && fs.statSync(sourcePath).isDirectory();
    const shouldArchive = isDirectory && options.archive;

    // If it's a directory and --archive is specified, archive it first
    if (shouldArchive) {
      // Validate it's a directory
      if (!validatePath(sourcePath, 'directory')) {
        return;
      }

      // Create a temporary file for the archive
      tempPath = `${outputPath}.archive.tmp`;

      // Show archiving spinner
      const archiveSpinner = createSpinner('Creating archive from directory...');
      archiveSpinner.start();

      try {
        // Archive the directory
        const archiveOptions: Record<string, string[]> = {};
        if (options.include) archiveOptions.include = options.include.split(',');
        if (options.exclude) archiveOptions.exclude = options.exclude.split(',');

        await archiveDirectory(sourcePath, tempPath, Object.keys(archiveOptions).length ? archiveOptions : {});
        fileToCompress = tempPath;

        // Update spinner
        archiveSpinner.succeed(`Directory archived to temporary file: ${tempPath}`);
      } catch (archiveErr) {
        archiveSpinner.fail('Failed to archive directory');
        // Clean up temp file if it exists
        if (tempPath && fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            warning(`Failed to clean up temporary file: ${tempPath}`);
          }
        }
        if (archiveErr instanceof Error) {
          error(`Archive error: ${archiveErr.message}`);
        }
        return;
      }
    } else {
      // Validate source path as a file
      if (!validatePath(sourcePath, 'file')) {
        return;
      }
    }

    // Get source file info
    const sourceInfo = getFileInfo(fileToCompress);
    if (!sourceInfo) {
      error(`Failed to get source file info: ${fileToCompress}`);
      // Clean up temp file if it exists
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          warning(`Failed to clean up temporary file: ${tempPath}`);
        }
      }
      return;
    }

    // Get compression algorithm
    const algorithm = options.algorithm ? getCompressionAlgorithm(options.algorithm) : CompressionAlgorithm.GZIP;

    // Show spinner
    const sourceType = shouldArchive ? 'archive' : 'file';
    const spinner = createSpinner(`Compressing ${sourceType} with ${algorithm}...`);
    spinner.start();

    try {
      // Compress file with validated options
      const compressOptions: { algorithm: CompressionAlgorithm; level?: number } = { algorithm };
      if (typeof options.level === 'string') {
        // We know it's already validated to be a valid number between 1-9
        compressOptions.level = parseInt(options.level, 10);
      }
      await compressFile(fileToCompress, outputPath, compressOptions);

      // Get output file info
      const outputInfo = getFileInfo(outputPath);
      if (!outputInfo) {
        spinner.fail('Failed to get output file info');
        return;
      }

      // Calculate compression ratio
      const ratio = sourceInfo.size === 0
        ? '0.00'
        : (((sourceInfo.size - outputInfo.size) / sourceInfo.size) * 100).toFixed(2);

      // Show success message
      const successMsg = shouldArchive
        ? `Directory archived and compressed: ${outputPath} (${outputInfo.formattedSize}, ${ratio}% reduction)`
        : `File compressed: ${outputPath} (${outputInfo.formattedSize}, ${ratio}% reduction)`;

      spinner.succeed(successMsg);
    } catch (compressErr) {
      spinner.fail(`Failed to compress ${sourceType}`);
      throw compressErr;
    } finally {
      // Clean up temp file if it exists
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          warning(`Failed to clean up temporary file: ${tempPath}`);
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to compress: ${err.message}`);
    } else {
      error('Failed to compress: Unknown error');
    }
  }
}

/**
 * Decompress command handler
 */
export async function handleDecompress(sourcePath: string, outputPath: string, options: Options): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema],
    [sourcePath, outputPath]
  )) {
    return;
  }
  try {
    // Validate source path
    if (!validatePath(sourcePath, 'file')) {
      return;
    }

    // Get algorithm if specified
    const algorithm = options.algorithm ? getCompressionAlgorithm(options.algorithm) : undefined;

    // Show spinner with algorithm info if specified
    const spinnerText = algorithm
      ? `Decompressing file using ${algorithm} algorithm...`
      : 'Decompressing file...';
    const spinner = createSpinner(spinnerText);
    spinner.start();

    // Create a temp path for the decompressed file if we need to unarchive
    const shouldUnarchive = options.unarchive === true;
    let decompressedPath = outputPath;
    let tempPath: string | null = null;

    // If we're going to unarchive, use a temporary file for decompression
    if (shouldUnarchive) {
      tempPath = `${outputPath}.decompressed.tmp`;
      decompressedPath = tempPath;
    }

    try {
      // Decompress file with optional algorithm
      await decompressFile(sourcePath, decompressedPath, algorithm);

      // If unarchive option is specified, try to unarchive the decompressed file
      if (shouldUnarchive) {
        const unarchiveSpinner = createSpinner('Extracting archive...');
        unarchiveSpinner.start();

        try {
          // Make sure the output directory exists
          const outputDir = path.dirname(outputPath);
          await fs.promises.mkdir(outputDir, { recursive: true });

          // Unarchive the file
          await unarchiveFile(decompressedPath, outputPath);

          // Update spinner with success message
          unarchiveSpinner.succeed(`Archive extracted to: ${outputPath}`);
        } catch (unarchiveErr) {
          // Handle unarchive errors
          unarchiveSpinner.fail('Failed to extract archive');

          if (unarchiveErr instanceof Error) {
            // If the decompressed file is not a valid archive, copy it to the output path
            if (unarchiveErr.message.includes('Invalid archive format')) {
              warning('The decompressed file is not a valid archive. Saving as regular file.');
              // Copy the decompressed file to the output path
              await fs.promises.copyFile(decompressedPath, outputPath);
            } else {
              throw unarchiveErr;
            }
          } else {
            throw unarchiveErr;
          }
        }
      }

      // Get output file or directory info
      const outputInfo = shouldUnarchive
        ? { formattedSize: 'directory' } // For unarchived directories
        : getFileInfo(outputPath);

      // Show appropriate success message
      const successMsg = shouldUnarchive
        ? `File decompressed and extracted to: ${outputPath}`
        : `File decompressed: ${outputPath} (${outputInfo?.formattedSize})`;

      spinner.succeed(successMsg);
    } catch (processErr) {
      spinner.fail('Processing failed');
      throw processErr;
    } finally {
      // Clean up temp file if it exists
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          warning(`Failed to clean up temporary file: ${tempPath}`);
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to process file: ${err.message}`);
    } else {
      error('Failed to process file: Unknown error');
    }
  }
}

/**
 * Sign command handler
 */
export async function handleSign(sourcePath: string, outputPath: string, options: Options): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema, SignOptionsSchema],
    [sourcePath, outputPath, options]
  )) {
    return;
  }
  try {
    // Validate source path
    if (!validatePath(sourcePath, 'file')) {
      return;
    }

    // Path existence validation (already validated format with Zod)

    if (options.privkey && !validatePath(options.privkey, 'file')) {
      return;
    }

    // Show spinner
    const spinner = createSpinner('Creating signature...');
    spinner.start();

    // Sign file
    const signOpts: Record<string, unknown> = {};
    if (options.privkey) signOpts.privateKeyPath = options.privkey;
    await signFile(sourcePath, outputPath, signOpts);

    // Show success message
    spinner.succeed(`Signature created: ${outputPath}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to create signature: ${err.message}`);
    } else {
      error('Failed to create signature: Unknown error');
    }
  }
}

/**
 * Verify command handler
 */
export async function handleVerify(filePath: string, signaturePath: string, options: Options): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema, VerifyOptionsSchema],
    [filePath, signaturePath, options]
  )) {
    return;
  }
  try {
    // Validate paths
    if (!validatePath(filePath, 'file') || !validatePath(signaturePath, 'file')) {
      return;
    }

    // Path existence validation (already validated format with Zod)

    if (options.pubkey && !validatePath(options.pubkey, 'file')) {
      return;
    }

    // Show spinner
    const spinner = createSpinner('Verifying signature...');
    spinner.start();

    try {
      // Verify signature
      const verifyOpts: Record<string, unknown> = {};
      if (options.pubkey) verifyOpts.publicKeyPath = options.pubkey;
      const isValid = await verifyFile(filePath, signaturePath, verifyOpts);

      // Show result
      if (isValid) {
        spinner.succeed('Signature is valid');
      } else {
        spinner.fail('Signature is invalid');
      }
    } catch (verifyErr) {
      // Stop the spinner if there's an error during verification
      spinner.fail('Verification failed');
      throw verifyErr;
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to verify signature: ${err.message}`);
    } else {
      error('Failed to verify signature: Unknown error');
    }
  }
}

/**
 * Generate key pair command handler
 */
export async function handleGenerateKeys(privateKeyPath: string, publicKeyPath: string): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema],
    [privateKeyPath, publicKeyPath]
  )) {
    return;
  }
  try {
    // Show spinner
    const spinner = createSpinner('Generating Ed25519 key pair...');
    spinner.start();

    // Generate key pair
    await generateAndSaveKeyPair({
      privateKeyPath,
      publicKeyPath,
    });

    // Show success message
    spinner.succeed(`Key pair generated:\n  Private key: ${privateKeyPath}\n  Public key: ${publicKeyPath}`);

    // Show warning message
    warning('Keep your private key secure and do not share it with anyone!');
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to generate key pair: ${err.message}`);
    } else {
      error('Failed to generate key pair: Unknown error');
    }
  }
}

/**
 * Derive public key command handler
 */
export async function handleDerivePublicKey(privateKeyPath: string, publicKeyPath: string): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema],
    [privateKeyPath, publicKeyPath]
  )) {
    return;
  }
  try {
    // Validate private key path
    if (!validatePath(privateKeyPath, 'file')) {
      return;
    }

    // Show spinner
    const spinner = createSpinner('Deriving public key from private key...');
    spinner.start();

    // Derive public key
    await deriveAndSavePublicKey(privateKeyPath, publicKeyPath);

    // Show success message
    spinner.succeed(`Public key derived: ${publicKeyPath}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to derive public key: ${err.message}`);
    } else {
      error('Failed to derive public key: Unknown error');
    }
  }
}

/**
 * Package command handler (archive + compress + sign)
 */
export async function handlePackage(sourcePath: string, outputPath: string, options: Options): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema, PackageOptionsSchema],
    [sourcePath, outputPath, options]
  )) {
    return;
  }
  try {
    // Validate source path
    if (!validatePath(sourcePath, 'directory')) {
      return;
    }

    // Get compression algorithm
    const algorithm = options.algorithm ? getCompressionAlgorithm(options.algorithm) : CompressionAlgorithm.GZIP;

    // Show spinner
    const spinner = createSpinner('Creating package...');
    spinner.start();

    // Create signing options if private key is provided
    const signOptions = options.privkey ? {
      privateKeyPath: options.privkey,
    } : undefined;

    // Create package
    const result = await createPackage(sourcePath, outputPath, algorithm, signOptions);

    // Get file info
    const archiveInfo = getFileInfo(result.archivePath);
    const packageInfo = getFileInfo(result.compressedPath);

    // Show success message
    spinner.succeed('Package created successfully');

    // Show files info
    info('Generated files:');
    info(`  Archive: ${result.archivePath} (${archiveInfo?.formattedSize})`);
    info(`  Package: ${result.compressedPath} (${packageInfo?.formattedSize})`);

    if (result.signaturePath) {
      info(`  Signature: ${result.signaturePath}`);
    }

    // Calculate compression ratio if both files exist
    if (archiveInfo && packageInfo) {
      const ratio = archiveInfo.size === 0
        ? '0.00'
        : (((archiveInfo.size - packageInfo.size) / archiveInfo.size) * 100).toFixed(2);
      info(`Compression ratio: ${ratio}%`);
    }

    // Always clean up temporary archive file
    fs.unlinkSync(result.archivePath);
    info(`Temporary archive file removed: ${result.archivePath}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to create package: ${err.message}`);
    } else {
      error('Failed to create package: Unknown error');
    }
  }
}

/**
 * Unarchive command handler
 */
export async function handleUnarchive(archivePath: string, outputPath: string): Promise<void> {
  // Validate input parameters
  if (!validateParams(
    [PathSchema, PathSchema],
    [archivePath, outputPath]
  )) {
    return;
  }
  try {
    // Validate archive path
    if (!validatePath(archivePath, 'file')) {
      return;
    }

    // Show spinner
    const spinner = createSpinner('Extracting archive...');
    spinner.start();

    // Extract archive
    await unarchiveFile(archivePath, outputPath);

    // Show success message
    spinner.succeed(`Archive extracted to: ${outputPath}`);
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(`Failed to extract archive: ${err.message}`);
    } else {
      error('Failed to extract archive: Unknown error');
    }
  }
}