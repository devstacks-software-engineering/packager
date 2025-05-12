# @devstacks/packager

A versatile utility for archiving, compressing, and signing web applications for cross-platform deployment. 

This package provides a complete solution for bundling web applications as native applications across multiple platforms, with support for:

- **Archiving**: Package web applications while preserving folder structure
- **Compression**: Support for multiple compression algorithms
- **Cryptography**: Ed25519 signing and verification for security
- **CLI**: Command-line interface for easy integration
- **API**: Programmatic API for importing into other projects

## Installation

### Global Installation

```bash
npm install -g @devstacks/packager
```

### Project Installation

```bash
npm install @devstacks/packager
```

### Using with npx

```bash
npx @devstacks/packager [command]
```

## Development

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/devstacks-software-engineering/packager.git
cd packager/base
npm install
```

### Building

Build the project:

```bash
npm run build
```

### Local Testing

Install the package globally from your local copy:

```bash
# First build the project
npm run build

# Then link it globally
npm link

# Now you can run the CLI from anywhere
packager --version
```

To uninstall the local version:

```bash
npm unlink -g @devstacks/packager
```

## CLI Usage

The packager CLI provides commands for all major functionality:

### Archive a Directory

```bash
packager archive ./src ./output.archive
# or
packager a ./src ./output.archive

# With include/exclude patterns
packager archive ./src ./output.archive --include "**/*.html,**/*.js,**/*.css" --exclude "**/*.map,**/node_modules/**"
```

### Compress a File

```bash
packager compress ./input.file ./output.compressed
# or
packager c ./input.file ./output.compressed

# With specific algorithm and level
packager compress ./input.file ./output.compressed --algorithm gzip --level 9
```

### Decompress a File

```bash
packager decompress ./input.compressed ./output.file
# or
packager d ./input.compressed ./output.file
```

### Generate Ed25519 Key Pair

```bash
packager generate-keys ./private.key ./public.key
# or
packager g ./private.key ./public.key
```

### Derive Public Key from Private Key

```bash
packager derive-public-key ./private.key ./public.key
# or
packager p ./private.key ./public.key
```

### Sign a File

```bash
packager sign ./input.file ./output.signature --privkey ./private.key
# or
packager s ./input.file ./output.signature --privkey ./private.key
```

### Verify a Signature

```bash
packager verify ./input.file ./input.signature --pubkey ./public.key
# or
packager v ./input.file ./input.signature --pubkey ./public.key
```

### Create a Complete Package (Archive + Compress + Sign)

```bash
packager package ./src ./output --algorithm gzip --privkey ./private.key
# or
packager pkg ./src ./output --algorithm gzip --privkey ./private.key

# Using the 'acs' shorthand (archive + compress + sign)
packager acs ./src ./output --algorithm gzip --privkey ./private.key

# Specify path with --path option
packager acs --path ./src ./output --algorithm gzip --privkey ./private.key
```

## API Usage

The packager provides a programmatic API for use in your projects. All input parameters are validated using zod schema validation:

```typescript
import {
  archiveDirectory,
  compressFile,
  decompressFile,
  generateAndSaveKeyPair,
  signFile,
  verifyFile,
  createPackage,
  CompressionAlgorithm,
} from '@devstacks/packager';

// Archive a directory
await archiveDirectory('/path/to/source', '/path/to/output.archive');

// Compress a file
await compressFile('/path/to/input.file', '/path/to/output.compressed', {
  algorithm: CompressionAlgorithm.GZIP,
  level: 9,
});

// Decompress a file
await decompressFile('/path/to/input.compressed', '/path/to/output.file');

// Generate an Ed25519 key pair
await generateAndSaveKeyPair({
  privateKeyPath: '/path/to/private.key',
  publicKeyPath: '/path/to/public.key',
});

// Sign a file
await signFile('/path/to/input.file', '/path/to/output.signature', {
  privateKeyPath: '/path/to/private.key',
});

// Verify a signature
const isValid = await verifyFile('/path/to/input.file', '/path/to/input.signature', {
  publicKeyPath: '/path/to/public.key',
});

// Create a complete package (archive + compress + sign)
await createPackage(
  '/path/to/source',
  '/path/to/output',
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

### **DEFLATE**

* **Description:**
    * A lossless data compression algorithm that uses a combination of LZ77 and Huffman coding. It is the core algorithm for GZIP and ZIP.
* **Best For Compression:**
    * Good balance between compression ratio and speed; scenarios requiring low overhead.
* **Native Decompression Support & Best Fit for Decompression:**
    * **Windows (C#/.NET):**
        * Native support via `System.IO.Compression.DeflateStream`.
        * Fits well when decompressing data from GZIP or ZIP archives, or when a lightweight, fast decompression is needed.
    * **Linux (Python with GTK):**
        * Native support via the `zlib` standard library.
        * Excellent fit for general-purpose decompression where `zlib` is readily available.
    * **Android (Java/Kotlin):**
        * Native support via `java.util.zip.InflaterInputStream` or `java.util.zip.Inflater`.
        * A good choice for decompressing ZIP files or raw DEFLATE streams.
    * **iOS/macOS (Swift):**
        * Native support via Apple's Compression framework (using `Algorithm.zlib` or the C-level `COMPRESSION_ZLIB`).
        * Ideal for decompressing raw DEFLATE streams or as the core for handling GZIP/ZIP data.


### **GZIP**

* **Description:**
    * Based on DEFLATE, it adds a header and trailer with metadata, including a CRC32 checksum for error detection. Good compression ratio and widely compatible.
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
        * Native support by using Apple's Compression framework with `Algorithm.zlib` (DEFLATE) and manually handling GZIP headers/trailers, or by leveraging common system libraries that wrap zlib for GZIP.
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
        * Native support is less direct for general app development compared to DEFLATE/GZIP; often available via WebView for web content or through JNI with Brotli libraries.
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