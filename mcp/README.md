# Packager MCP

This is a Model Context Protocol (MCP) server that provides package deployment files compression, archiving, and signing capabilities to AI assistants.

## Installation

The Packager MCP can be integrated with various AI assistant platforms. Below are instructions for different environments:

### Claude Code

To add the Packager MCP to Claude Code, run the following command:

```bash
claude mcp add packager npx @devstacks/packager-mcp
```

### Cursor, Winsurf, or Claude Desktop

To add the Packager MCP to Cursor, Winsurf, or Claude Desktop, add the following configuration to your MCP configuration file:

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

## Usage

Once installed, the Packager MCP can be used by the AI assistant to compress, archive, and sign deployment files.

### DOCUMENT OPTIONS HERE

## Features

- Compress files using Gzip, Brotli, or Deflate
- Archive files with custom algorithm
- Sign files using Ed25519

## License

MIT