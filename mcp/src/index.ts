#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as Packager from '@devstacks/packager';

const version = '0.1.0'; // TODO: Consider if this should match @devstacks/packager version or mcp package version

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
    console.log('archive tool called with:', params);
    return respond('Archive tool: Not implemented yet. Params: ' + JSON.stringify(params));
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
    console.log('compress tool called with:', params);
    // Actual implementation would call the packager's compress function
    return respond('Compress tool: Not implemented yet. Params: ' + JSON.stringify(params));
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
    console.log('decompress tool called with:', params);
    return respond('Decompress tool: Not implemented yet. Params: ' + JSON.stringify(params));
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
    console.log('sign tool called with:', params);
    return respond('Sign tool: Not implemented yet. Params: ' + JSON.stringify(params));
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
    console.log('verify tool called with:', params);
    return respond('Verify tool: Not implemented yet. Params: ' + JSON.stringify(params));
  }
);

server.tool(
  'generate-keys',
  {
    privateKeyPath: z.string().describe('Path where the private key file will be saved'),
    publicKeyPath: z.string().describe('Path where the public key file will be saved'),
  },
  async (params) => {
    console.log('generate-keys tool called with:', params);
    return respond('Generate keys tool: Not implemented yet. Params: ' + JSON.stringify(params));
  }
);

server.tool(
  'derive-public-key',
  {
    privateKeyPath: z.string().describe('Private key file path'),
    publicKeyPath: z.string().describe('Output public key file path'),
  },
  async (params) => {
    console.log('derive-public-key tool called with:', params);
    return respond('Derive public key tool: Not implemented yet. Params: ' + JSON.stringify(params));
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
    console.log('package tool called with:', params);
    return respond('Package tool: Not implemented yet. Params: ' + JSON.stringify(params));
  }
);

server.tool(
  'unarchive',
  {
    archiveFile: z.string().describe('Archive file to extract'),
    outputDirectory: z.string().describe('Output directory path'),
  },
  async (params) => {
    console.log('unarchive tool called with:', params);
    return respond('Unarchive tool: Not implemented yet. Params: ' + JSON.stringify(params));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

// console.log(`MCP server "${server.name}" version ${server.version} is running.`); // FIXME: Linter issues with accessing server.name and server.version