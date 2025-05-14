#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as Packager from '@devstacks/packager';
import fs from 'node:fs';
import path from 'node:path';

const version = '0.1.5';

const server = new McpServer({
  name: 'packager',
  version,
});

// Helper function to create a standard response
function respond(text: string, isError: boolean = false): CallToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ],
    isError
  };
}

server.tool(
  'archive',
  {
    source: z.string().describe('Source directory to archive'),
    output: z.string().describe('Output archive file path'),
    include: z.string().optional().describe('Include file pattern (glob), comma-separated'),
    exclude: z.string().optional().describe('Exclude file pattern (glob), comma-separated'),
  },
  async (params) => {
    try {
      // Parse include/exclude patterns
      const archiveOptions: Record<string, string[]> = {};
      if (params.include) archiveOptions.include = params.include.split(',');
      if (params.exclude) archiveOptions.exclude = params.exclude.split(',');

      // Archive the directory
      await Packager.archiveDirectory(
        params.source,
        params.output,
        Object.keys(archiveOptions).length ? archiveOptions : {}
      );

      // Get file info for the output
      const stats = await fs.promises.stat(params.output);
      const fileSize = Packager.formatFileSize(stats.size);

      return respond(`Archive created: ${params.output} (${fileSize})`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to create archive: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'compress',
  {
    source: z.string().describe('Source file or directory to compress'),
    output: z.string().describe('Output compressed file path'),
    algorithm: z.enum(['gzip', 'brotli', 'deflate']).optional().default('gzip').describe('Compression algorithm'),
    level: z.number().min(1).max(9).optional().describe('Compression level (1-9)'),
    archive: z.boolean().optional().describe('Archive the directory before compression if source is a directory'),
    include: z.string().optional().describe('Include file pattern for archiving (glob), comma-separated'),
    exclude: z.string().optional().describe('Exclude file pattern for archiving (glob), comma-separated'),
  },
  async (params) => {
    try {
      // Create a temp path for the archive if needed
      let fileToCompress = params.source;
      let tempPath: string | null = null;

      // Check if source is a directory and --archive option is set
      const isDirectory = fs.existsSync(params.source) && fs.statSync(params.source).isDirectory();
      const shouldArchive = isDirectory && params.archive;

      // If it's a directory and archive is specified, archive it first
      if (shouldArchive) {
        // Create a temporary file for the archive
        tempPath = `${params.output}.archive.tmp`;

        // Archive the directory
        const archiveOptions: Record<string, string[]> = {};
        if (params.include) archiveOptions.include = params.include.split(',');
        if (params.exclude) archiveOptions.exclude = params.exclude.split(',');

        await Packager.archiveDirectory(
          params.source,
          tempPath,
          Object.keys(archiveOptions).length ? archiveOptions : {}
        );
        fileToCompress = tempPath;
      }

      try {
        // Get compression algorithm
        const algorithm = params.algorithm
          ? Packager.getCompressionAlgorithm(params.algorithm)
          : Packager.CompressionAlgorithm.GZIP;

        // Compress file with validated options
        const compressOptions: { algorithm: Packager.CompressionAlgorithm; level?: number } = { algorithm };
        if (params.level) {
          compressOptions.level = params.level;
        }

        await Packager.compressFile(fileToCompress, params.output, compressOptions);

        // Get file info for source and output
        const sourceStats = await fs.promises.stat(fileToCompress);
        const sourceSize = sourceStats.size;
        const outputStats = await fs.promises.stat(params.output);
        const outputSize = outputStats.size;

        // Calculate compression ratio
        const ratio = sourceSize === 0
          ? '0.00'
          : (((sourceSize - outputSize) / sourceSize) * 100).toFixed(2);

        // Format sizes
        const outputSizeFormatted = Packager.formatFileSize(outputSize);

        // Format success message based on whether we archived or not
        const successMsg = shouldArchive
          ? `Directory archived and compressed: ${params.output} (${outputSizeFormatted}, ${ratio}% reduction)`
          : `File compressed: ${params.output} (${outputSizeFormatted}, ${ratio}% reduction)`;

        return respond(successMsg);
      } finally {
        // Clean up temp file if it exists
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to compress: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'decompress',
  {
    source: z.string().describe('Source compressed file'),
    output: z.string().describe('Output decompressed file path or directory'),
    algorithm: z.enum(['gzip', 'brotli', 'deflate']).optional().describe('Compression algorithm (auto-detected if not specified)'),
    unarchive: z.boolean().optional().describe('Unarchive the decompressed file if it is an archive'),
  },
  async (params) => {
    try {
      // Get algorithm if specified
      const algorithm = params.algorithm
        ? Packager.getCompressionAlgorithm(params.algorithm)
        : undefined;

      // Create a temp path for the decompressed file if we need to unarchive
      const shouldUnarchive = params.unarchive === true;
      let decompressedPath = params.output;
      let tempPath: string | null = null;

      // If we're going to unarchive, use a temporary file for decompression
      if (shouldUnarchive) {
        tempPath = `${params.output}.decompressed.tmp`;
        decompressedPath = tempPath;
      }

      try {
        // Decompress file with optional algorithm
        await Packager.decompressFile(params.source, decompressedPath, algorithm);

        // If unarchive option is specified, try to unarchive the decompressed file
        if (shouldUnarchive) {
          try {
            // Make sure the output directory exists
            const outputDir = path.dirname(params.output);
            await fs.promises.mkdir(outputDir, { recursive: true });

            // Unarchive the file
            await Packager.unarchiveFile(decompressedPath, params.output);

            return respond(`File decompressed and extracted to: ${params.output}`);
          } catch (unarchiveErr) {
            // If the decompressed file is not a valid archive, copy it to the output path
            if (unarchiveErr instanceof Error && unarchiveErr.message.includes('Invalid archive format')) {
              await fs.promises.copyFile(decompressedPath, params.output);
              return respond(
                `Warning: The decompressed file is not a valid archive. Saved as regular file to: ${params.output}`
              );
            } else {
              throw unarchiveErr;
            }
          }
        } else {
          // Get output file info
          const outputStats = await fs.promises.stat(params.output);
          const outputSize = Packager.formatFileSize(outputStats.size);

          return respond(`File decompressed: ${params.output} (${outputSize})`);
        }
      } finally {
        // Clean up temp file if it exists
        if (tempPath && fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to process file: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'sign',
  {
    source: z.string().describe('Source file to sign'),
    output: z.string().describe('Output signature file path'),
    privkey: z.string().describe('Path to the private key file'),
  },
  async (params) => {
    try {
      // Sign file with the provided private key
      const signOptions: Record<string, unknown> = {
        privateKeyPath: params.privkey
      };

      await Packager.signFile(params.source, params.output, signOptions);

      return respond(`Signature created: ${params.output}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to create signature: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'verify',
  {
    file: z.string().describe('File to verify'),
    signature: z.string().describe('Signature file path'),
    pubkey: z.string().describe('Path to the public key file'),
  },
  async (params) => {
    try {
      // Verify signature with the provided public key
      const verifyOptions: Record<string, unknown> = {
        publicKeyPath: params.pubkey
      };

      const isValid = await Packager.verifyFile(params.file, params.signature, verifyOptions);

      if (isValid) {
        return respond('Signature is valid');
      } else {
        return respond('Signature is invalid', true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to verify signature: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'generate-keys',
  {
    privateKeyPath: z.string().describe('Path where the private key file will be saved'),
    publicKeyPath: z.string().describe('Path where the public key file will be saved'),
  },
  async (params) => {
    try {
      // Generate and save key pair
      await Packager.generateAndSaveKeyPair({
        privateKeyPath: params.privateKeyPath,
        publicKeyPath: params.publicKeyPath,
      });

      const message = [
        'Key pair generated:',
        `  Private key: ${params.privateKeyPath}`,
        `  Public key: ${params.publicKeyPath}`,
        '',
        'Keep your private key secure and do not share it with anyone!'
      ].join('\n');
      return respond(message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to generate key pair: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'derive-public-key',
  {
    privateKeyPath: z.string().describe('Private key file path'),
    publicKeyPath: z.string().describe('Output public key file path'),
  },
  async (params) => {
    try {
      // Derive and save public key from private key
      await Packager.deriveAndSavePublicKey(
        params.privateKeyPath,
        params.publicKeyPath
      );

      return respond(`Public key derived: ${params.publicKeyPath}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to derive public key: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'package',
  {
    source: z.string().describe('Source directory to package'),
    output: z.string().describe('Output file path for the compressed file'),
    algorithm: z.enum(['gzip', 'brotli', 'deflate']).optional().describe('Compression algorithm'),
    privkey: z.string().optional().describe('Path to the private key file for signing'),
  },
  async (params) => {
    try {
      // Get compression algorithm
      const algorithm = params.algorithm
        ? Packager.getCompressionAlgorithm(params.algorithm)
        : Packager.CompressionAlgorithm.GZIP;

      // Create signing options if private key is provided
      const signOptions = params.privkey ? {
        privateKeyPath: params.privkey,
      } : null;

      // Create package
      const result = await Packager.createPackage(
        params.source,
        params.output,
        algorithm,
        signOptions
      );

      // Get file info
      const archiveStats = await fs.promises.stat(result.archivePath);
      const packageStats = await fs.promises.stat(result.compressedPath);
      const archiveSize = Packager.formatFileSize(archiveStats.size);
      const packageSize = Packager.formatFileSize(packageStats.size);

      // Calculate compression ratio
      const ratio = archiveStats.size === 0
        ? '0.00'
        : (((archiveStats.size - packageStats.size) / archiveStats.size) * 100).toFixed(2);

      // Build response message
      let responseMsg = 'Package created successfully\n\n';
      responseMsg += `Archive: ${result.archivePath} (${archiveSize})\n`;
      responseMsg += `Package: ${result.compressedPath} (${packageSize})\n`;

      if (result.signaturePath) {
        responseMsg += `Signature: ${result.signaturePath}\n`;
      }

      responseMsg += `Compression ratio: ${ratio}%\n`;

      // Clean up the temporary archive file
      fs.unlinkSync(result.archivePath);
      responseMsg += `Temporary archive file removed: ${result.archivePath}`;

      return respond(responseMsg);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to create package: ${errorMessage}`, true);
    }
  }
);

server.tool(
  'unarchive',
  {
    archiveFile: z.string().describe('Archive file to extract'),
    outputDirectory: z.string().describe('Output directory path'),
  },
  async (params) => {
    try {
      // Extract archive
      await Packager.unarchiveFile(params.archiveFile, params.outputDirectory);

      return respond(`Archive extracted to: ${params.outputDirectory}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return respond(`Failed to extract archive: ${errorMessage}`, true);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);