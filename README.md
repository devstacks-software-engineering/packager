# @devstacks/packager

[![npm version](https://img.shields.io/npm/v/@devstacks/packager)](https://www.npmjs.com/package/@devstacks/packager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/devstacks-software-engineering/packager/graph/badge.svg)](https://codecov.io/gh/devstacks-software-engineering/packager)

A robust utility for archiving, compressing, and signing web applications for cross-platform deployment. Built with TypeScript and designed for both CLI and programmatic usage.

## Features

- **📦 Archiving**: Preserve directory structures with metadata
- **🗜️ Compression**: Multiple algorithms (GZIP, Brotli)
- **🔑 Cryptography**: Ed25519 signing and verification
- **🖥️ CLI**: Intuitive command-line interface
- **⚡ API**: Fully typed, promise-based API
- **🔒 Security**: Built with security best practices
- **📏 Validation**: Comprehensive input validation with Zod

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)
  - [Archive Operations](#archive-operations)
  - [Compression Operations](#compression-operations)
  - [Cryptography Operations](#cryptography-operations)
  - [Complete Packaging](#complete-packaging)
- [API Reference](#api-reference)
  - [Archive](#archive)
  - [Compression](#compression)
  - [Cryptography](#cryptography)
  - [Utilities](#utilities)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Prerequisites

- Node.js 18.0.0 or later
- npm 7.0.0 or later

### Global Installation

For CLI usage:

```bash
npm install -g @devstacks/packager
```

### Project Installation

For programmatic usage:

```bash
npm install @devstacks/packager
```

### Using with npx

For one-off usage without installation:

```bash
npx @devstacks/packager [command] [options]
```

## Quick Start

1. **Create a package** (archive + compress + sign):

```bash
# Generate a key pair first
packager generate-keys private.key public.key

# Create a package
packager package ./src ./dist/package.pkg --algorithm gzip --privkey private.key
```

2. **Use in your code**:

```typescript
import { createPackage, CompressionAlgorithm } from '@devstacks/packager';

// Create a package programmatically
await createPackage(
  './src',
  './dist/package.pkg',
  {
    algorithm: CompressionAlgorithm.GZIP,
    privateKeyPath: './private.key'
  }
);
```

## CLI Usage

### Archive Operations

#### Archive a Directory

```bash
# Basic usage
packager archive ./src ./output.archive

# With include/exclude patterns
packager archive ./src ./output.archive \
  --include "**/*.html,**/*.js,**/*.css" \
  --exclude "**/*.map,**/node_modules/**,**/.git/**"

# Shorthand
packager a ./src ./output.archive
```

#### Unarchive a File

```bash
packager unarchive ./output.archive ./extracted-files
```

### Compression Operations

#### Compress a File

```bash
# Basic compression
packager compress input.txt output.txt.gz

# With specific algorithm and level (1-9)
packager compress input.txt output.txt.gz --algorithm gzip --level 9

# Archive directory before compressing
packager compress ./src output.pkg --archive

# Shorthand
packager c input.txt output.txt.gz
```

#### Decompress a File

```bash
# Basic decompression
packager decompress input.txt.gz output.txt

# Auto-detect algorithm
packager decompress input.compressed output.file

# Shorthand
packager d input.txt.gz output.txt
```

### Cryptography Operations

#### Generate Key Pair

```bash
# Generate Ed25519 key pair
packager generate-keys private.key public.key

# Shorthand
packager g private.key public.key
```

#### Sign a File

```bash
# Sign a file
packager sign file.txt file.txt.sig --privkey private.key

# Shorthand
packager s file.txt file.txt.sig --privkey private.key
```

#### Verify a Signature

```bash
# Verify a signature
packager verify file.txt file.txt.sig --pubkey public.key

# Shorthand
packager v file.txt file.txt.sig --pubkey public.key
```

### Complete Packaging

Create a complete package (archive + compress + sign) in one command:

```bash
# Basic package
packager package ./src ./dist/package.pkg --algorithm gzip --privkey private.key

# Shorthand
packager pkg ./src ./dist/package.pkg --algorithm gzip --privkey private.key

# Using the 'acs' shorthand (archive + compress + sign)
packager acs ./src ./dist/package.pkg --algorithm gzip --privkey private.key

# With include/exclude patterns
packager acs ./src ./dist/package.pkg \
  --algorithm gzip \
  --privkey private.key \
  --include "**/*.html,**/*.js,**/*.css" \
  --exclude "**/*.map"
```

## API Reference

### Archive

#### `archiveDirectory(sourcePath: string, outputPath: string, options?: ArchiveOptions): Promise<void>`

Archives a directory to a file.

```typescript
import { archiveDirectory } from '@devstacks/packager';

await archiveDirectory('./src', './output.archive', {
  include: ['**/*.js', '**/*.json'],
  exclude: ['**/node_modules/**', '**/.git/**']
});
```

**Options:**
- `include`: Array of glob patterns to include
- `exclude`: Array of glob patterns to exclude

#### `unarchiveFile(archivePath: string, outputPath: string): Promise<void>`

Extracts an archive to a directory.

```typescript
import { unarchiveFile } from '@devstacks/packager';

await unarchiveFile('./output.archive', './extracted');
```

### Compression

#### `compressFile(sourcePath: string, outputPath: string, options: CompressionOptions): Promise<void>`

Compresses a file using the specified algorithm.

```typescript
import { compressFile, CompressionAlgorithm } from '@devstacks/packager';

await compressFile('./input.txt', './output.txt.gz', {
  algorithm: CompressionAlgorithm.GZIP,
  level: 9
});
```

**Options:**
- `algorithm`: Compression algorithm (`GZIP` or `BROTLI`)
- `level`: Compression level (1-9, higher is better compression but slower)

#### `decompressFile(sourcePath: string, outputPath: string, options?: { algorithm?: CompressionAlgorithm }): Promise<void>`

Decompresses a file.

```typescript
import { decompressFile } from '@devstacks/packager';

await decompressFile('./input.txt.gz', './output.txt');
```

### Cryptography

#### `generateAndSaveKeyPair(options: KeyPairOptions): Promise<void>`

Generates and saves an Ed25519 key pair.

```typescript
import { generateAndSaveKeyPair } from '@devstacks/packager';

await generateAndSaveKeyPair({
  privateKeyPath: './private.key',
  publicKeyPath: './public.key'
});
```

#### `signFile(sourcePath: string, outputPath: string, options: SignOptions): Promise<void>`

Signs a file.

```typescript
import { signFile } from '@devstacks/packager';

await signFile('./input.txt', './input.txt.sig', {
  privateKeyPath: './private.key'
});
```

#### `verifyFile(filePath: string, signaturePath: string, options: VerifyOptions): Promise<boolean>`

Verifies a file's signature.

```typescript
import { verifyFile } from '@devstacks/packager';

const isValid = await verifyFile(
  './input.txt',
  './input.txt.sig',
  { publicKeyPath: './public.key' }
);
```

### Utilities

#### `createPackage(sourcePath: string, outputPath: string, options: PackageOptions): Promise<void>`

Creates a complete package (archive + compress + sign).

```typescript
import { createPackage, CompressionAlgorithm } from '@devstacks/packager';

await createPackage(
  './src',
  './dist/package.pkg',
  {
    algorithm: CompressionAlgorithm.GZIP,
    privateKeyPath: './private.key',
    include: ['**/*.js', '**/*.json'],
    exclude: ['**/node_modules/**']
  }
);
```

## Error Handling

All API functions throw typed errors that extend the native `Error` class. Always use try/catch blocks:

```typescript
try {
  await createPackage('./src', './dist/package.pkg', {
    algorithm: CompressionAlgorithm.GZIP,
    privateKeyPath: './private.key'
  });
} catch (error) {
  console.error('Package creation failed:', error.message);
  if (error.code === 'ENOENT') {
    console.error('File not found:', error.path);
  }
}
```

## Performance

### Compression Algorithms

| Algorithm | Best For | Compression | Speed | Native Support |
|-----------|----------|-------------|-------|----------------|
| GZIP      | General use | Good | Fast | Widely supported |
| Brotli    | Web content | Excellent | Medium | Modern browsers |

### Memory Usage

For large files, consider streaming or chunking to manage memory usage. The library handles files larger than memory by default.

## Security

### Key Management

- Always store private keys securely (never commit them to version control)
- Use environment variables for sensitive data:

```bash
export PRIVATE_KEY_PATH="/path/to/private.key"
packager sign file.txt file.txt.sig --privkey "$PRIVATE_KEY_PATH"
```

### Best Practices

1. Always verify signatures before processing untrusted files
2. Use strong compression levels (6-9) for sensitive data
3. Keep your dependencies up to date
4. Use the latest version of Node.js with security patches

## Development

### Setup

```bash
git clone https://github.com/devstacks-software-engineering/packager.git
cd packager/base
npm install
```

### Building

```bash
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npm run typecheck
```

### Local Development

Link the package for local development:

```bash
# Build and link
npm run build
npm link

# Now you can use it globally
packager --version
```

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

## License

MIT © [DevStacks](https://devstacks.com)
  CompressionAlgorithm.GZIP,
  { privateKeyPath: '/path/to/private.key' }
);
```

## Archive Format

The archive format is designed to be simple, efficient, and extensible:

- **Header**: Contains signature, version, and number of entries
- **Entry Table**: Contains offsets and sizes for each entry
- **Entry Data**: Contains metadata (path, size, MIME type) and file data

## Compression Algorithms

The packager supports multiple compression algorithms. The choice of algorithm can impact both the size of the compressed data and the performance of compression and decompression. Native platform support for decompression is a key factor in selecting an algorithm for optimal performance.

### **GZIP**

* **Description:**
    * A widely-used compression format that adds headers and trailers with metadata, including a CRC32 checksum for error detection. Good compression ratio and widely compatible.
* **Best For Compression:**
    * General-purpose usage, especially for web content and file transfer where compatibility and integrity checks are valued.
* **Native Decompression Support & Best Fit for Decompression:**
    * **Windows (C#/.NET):**
        * Native support via `System.IO.Compression.GZipStream`.
        * Ideal for decompressing `.gz` files or HTTP content encoded with GZIP.
    * **Linux (Python with GTK):**
        * Native support via the `gzip` and `zlib` standard libraries.
        * Widely used and fits well for decompressing files and web data.
    * **Android (Java/Kotlin):**
        * Native support via `java.util.zip.GZIPInputStream`.
        * Commonly used for decompressing web responses and `.gz` files.
    * **iOS/macOS (Swift):**
        * Native support by using Apple's Compression framework with `Algorithm.zlib` and manually handling GZIP headers/trailers, or by leveraging common system libraries that wrap zlib for GZIP.
        * Fits well for decompressing `.gz` files and GZIP-encoded web data.


### **BROTLI**

* **Description:**
    * A modern algorithm offering better compression ratios than GZIP, especially for text-based data.
* **Best For Compression:**
    * When compression ratio is the highest priority, particularly for static web assets like HTML, CSS, and JavaScript.
* **Native Decompression Support & Best Fit for Decompression:**
    * **Windows (C#/.NET):**
        * Native support available (e.g., `System.IO.Compression.BrotliStream` in .NET Core/5+).
        * Best fit for decompressing Brotli-encoded web content or assets where the .NET runtime provides built-in support.
    * **Linux (Python with GTK):**
        * Native decompression typically requires external libraries (e.g., `brotli` PyPI package).
        * Fits best when the environment is set up with these dependencies and maximum decompression ratio benefits are sought.
    * **Android (Java/Kotlin):**
        * Native support is less direct for general app development compared to GZIP; often available via WebView for web content or through JNI with Brotli libraries.
        * Best fit for decompressing Brotli-encoded content within web contexts or when specifically integrating a Brotli library.
    * **iOS/macOS (Swift):**
        * Native support via Apple's Compression framework (using `Algorithm.brotli` or C-level `COMPRESSION_BROTLI`, available iOS 13+/macOS 10.15+; C API availability might be iOS 15+ for some uses, requiring OS version checks).
        * Excellent for decompressing Brotli-encoded web content and text-heavy data directly within apps.


## Cryptography

The packager uses Ed25519 for digital signatures, which offers:

- **Small key sizes**: 32-byte public keys, 64-byte signatures
- **Fast verification**: 50-70x faster than RSA
- **High security**: Resistant to side-channel attacks

## License

MIT