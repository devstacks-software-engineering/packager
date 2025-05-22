import { vi, describe, it } from 'vitest';

// Create a mock spinner that we can reference later for assertions
export const mockSpinner = {
  start: vi.fn(),
  succeed: vi.fn(),
  fail: vi.fn(),
};

// Add a minimal test suite to prevent "No test suite found" error
describe('Common Test Utilities', () => {
  it('should export mock utilities', () => {
    // Just a placeholder test to make Vitest happy
  });
});

// Setup mocks for modules used across all command tests
export function setupMocks(): void {
  // Mock modules first before any imports
  vi.mock('../../../src/cli/utils.js', () => {
    return {
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      createSpinner: vi.fn(() => mockSpinner),
      validatePath: vi.fn(() => true),
      getFileInfo: vi.fn(() => ({
        size: 1024,
        formattedSize: '1 KB',
        extension: '.txt',
        basename: 'file.txt',
        dirname: '/test'
      })),
    };
  });

  vi.mock('../../../src/index.js', () => ({
    archiveDirectory: vi.fn(() => Promise.resolve()),
    compressFile: vi.fn(() => Promise.resolve()),
    decompressFile: vi.fn(() => Promise.resolve()),
    signFile: vi.fn(() => Promise.resolve()),
    verifyFile: vi.fn(() => Promise.resolve(true)),
    generateAndSaveKeyPair: vi.fn(() => Promise.resolve()),
    deriveAndSavePublicKey: vi.fn(() => Promise.resolve()),
    createPackage: vi.fn(() => Promise.resolve({
      archivePath: '/path/to/archive.archive',
      compressedPath: '/path/to/archive.compressed',
      signaturePath: '/path/to/archive.signature'
    })),
    unarchiveFile: vi.fn(() => Promise.resolve()),
    getCompressionAlgorithm: vi.fn(() => 'gzip'),
    CompressionAlgorithm: {
      GZIP: 'gzip',
      BROTLI: 'brotli'
    }
  }));

  vi.mock('node:fs', () => {
    const unlinkSyncMock = vi.fn();
    const existsSyncMock = vi.fn();
    const statSyncMock = vi.fn();
    // Define mocks for promise-based functions
    const mkdirMock = vi.fn(() => Promise.resolve(undefined));
    const copyFileMock = vi.fn(() => Promise.resolve());
    return {
      existsSync: existsSyncMock,
      statSync: statSyncMock,
      unlinkSync: unlinkSyncMock,
      // Add the promises object with mocked functions
      promises: {
        mkdir: mkdirMock,
        copyFile: copyFileMock,
      },
      default: {
        existsSync: existsSyncMock,
        statSync: statSyncMock,
        unlinkSync: unlinkSyncMock,
        // Also add promises to the default export if needed by imports
        promises: {
          mkdir: mkdirMock,
          copyFile: copyFileMock,
        }
      }
    };
  });
}

// Export utils path for consistent imports
export { default as path } from 'node:path';