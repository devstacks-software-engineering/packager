# Packager

A powerful toolkit for archiving, compressing, and securing files, available both as a standalone Node.js package and as an MCP (Model Context Protocol) server for AI assistants.

## Project Structure

### `/base` - Core Package ([`@devstacks/packager`](./base/README.md))
The main package that provides comprehensive file packaging capabilities, available both as a CLI tool and as a TypeScript/JavaScript library:

**Key Features**:
- **Archiving**: Preserve directory structures with metadata
- **Compression**: Multiple algorithms (GZIP, Brotli, DEFLATE)
- **Cryptography**: Ed25519 signing and verification
- **Type Safety**: Built with TypeScript and Zod validation

**Programmatic Usage**:
```typescript
import { 
  archiveDirectory,
  compressFile,
  signFile,
  CompressionAlgorithm 
} from '@devstacks/packager';

// Example: Archive and compress a directory
await archiveDirectory('./src', './output.tar', {
  include: ['**/*.js', '**/*.json'],
  exclude: ['**/node_modules/**', '**/test/**']
});

// Example: Sign a file
await signFile('app.js', 'app.js.sig', { 
  privateKeyPath: './private.key' 
});
```

**CLI Usage**:
```bash
# Archive and compress
packager archive ./src ./output.archive

# Compress a file
packager compress -a gzip ./output.archive ./output.archive.gz

# Sign a file
packager sign output.archive.gz output.archive.gz.sig --privkey private.key

# Verify a file
packager verify output.archive.gz output.archive.gz.sig --pubkey public.key

# Package (all in one)
packager package ./src ./output.archive.gz.sig --privkey private.key -a gzip
```

Ideal for Node.js projects that need programmatic or CLI-based file packaging functionality.

### `/mcp` - MCP Server ([`@devstacks/packager-mcp`](./mcp/README.md))
A specialized MCP server that exposes the packager's functionality to AI assistants:
- **AI Integration**: Enables AI tools to package, compress, and sign files
- **Cross-Platform**: Works with Claude Code, Cursor, Winsurf, and Claude Desktop
- **Secure**: Supports cryptographic signing and verification
- **Flexible**: Handles both single files and entire directories

Perfect for AI-assisted development workflows where file packaging is needed.

## Getting Started

### For Node.js Projects
```bash
npm install @devstacks/packager
```

### For AI Assistants
```bash
claude mcp add packager npx @devstacks/packager-mcp
```

## License
MIT