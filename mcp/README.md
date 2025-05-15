# Packager MCP

A powerful tool that helps AI assistants package, compress, and secure your files when preparing software for deployment.

## What is this?

This tool acts as a bridge between you and AI assistants, allowing them to:
- Compress your project files (using Gzip, Brotli, or Deflate)
- Bundle directories into single archive files
- Sign packages with cryptographic signatures for security
- Verify file authenticity

## Installation

### For Claude Code users

If you're using Claude Code, simply run:

```bash
claude mcp add packager npx @devstacks/packager-mcp
```

### For Cursor, Winsurf, or Claude Desktop users

Add this to your MCP configuration file:

```json
{
  "mcpServers": {
    "packager": {
      "command": "npx",
      "args": ["@devstacks/packager-mcp"]
    }
  }
}
```

## Available Tools

### archive

Creates a single file from an entire directory.

**Parameters:**
- `source`: Directory to archive (required)
- `output`: Where to save the archive file (required)
- `include`: Files to include, as comma-separated glob patterns (optional)
- `exclude`: Files to exclude, as comma-separated glob patterns (optional)

**Example request:**
"Archive my project directory, but only include JavaScript and JSON files, and exclude the node_modules folder"

### compress

Compresses files to reduce their size.

**Parameters:**
- `source`: File or directory to compress (required)
- `output`: Where to save the compressed file (required)
- `algorithm`: Compression method - "gzip" (default), "brotli", or "deflate" (optional)
- `level`: Compression level from 1-9, where 9 is maximum compression (optional)
- `archive`: Whether to archive a directory before compressing - true/false (optional)
- `include`: Files to include when archiving, as comma-separated glob patterns (optional)
- `exclude`: Files to exclude when archiving, as comma-separated glob patterns (optional)

**Example request:**
"Compress my project directory using brotli with maximum compression level, excluding node_modules and temp files"

### decompress

Extracts a previously compressed file.

**Parameters:**
- `source`: Compressed file to extract (required)
- `output`: Where to save the decompressed file or directory (required)
- `algorithm`: Compression method used - "gzip", "brotli", or "deflate" (optional, auto-detected)
- `unarchive`: Whether to extract the archive after decompressing - true/false (optional)

**Example request:**
"Decompress my app-deploy.gz file and extract its contents to the deploy folder"

### sign

Creates a cryptographic signature for a file to verify its authenticity.

**Parameters:**
- `source`: File to sign (required)
- `output`: Where to save the signature file (required)
- `privkey`: Path to your private key file (required)

**Example request:**
"Sign my distribution package with my private key located in the .keys folder"

### verify

Checks if a file matches its signature to ensure it hasn't been tampered with.

**Parameters:**
- `file`: File to verify (required)
- `signature`: Path to the signature file (required)
- `pubkey`: Path to the public key file (required)

**Example request:**
"Verify that my package hasn't been tampered with using its signature file and our public key"

### generate-keys

Creates a new pair of cryptographic keys for signing files.

**Parameters:**
- `privateKeyPath`: Where to save the private key (required)
- `publicKeyPath`: Where to save the public key (required)

**Example request:**
"Generate a new key pair for signing our deployment packages and save them to the .keys directory"

### derive-public-key

Extracts a public key from an existing private key.

**Parameters:**
- `privateKeyPath`: Path to your existing private key (required)
- `publicKeyPath`: Where to save the derived public key (required)

**Example request:**
"I have a private key but lost the public key. Can you derive the public key from my private key?"

### package

Does everything at once: archives, compresses, and optionally signs a directory.

**Parameters:**
- `source`: Directory to package (required)
- `output`: Where to save the packaged file (required)
- `algorithm`: Compression method - "gzip" (default), "brotli", or "deflate" (optional)
- `privkey`: Path to private key for signing (optional)

**Example request:**
"Create a complete package of my project directory, compress it with gzip, and sign it with my private key"

### unarchive

Extracts files from a previously created archive.

**Parameters:**
- `archiveFile`: Archive file to extract (required)
- `outputDirectory`: Where to extract the files (required)

**Example request:**
"Extract the files from my archive.bin file into the extracted-files directory"

## Key Features

- Compress files using Gzip, Brotli, or Deflate algorithms
- Archive entire directories with customizable file inclusion/exclusion
- Securely sign packages using Ed25519 cryptography
- Package entire projects with a single command
- Generate and manage cryptographic keys for security
- Verify file signatures to confirm authenticity

## License

MIT