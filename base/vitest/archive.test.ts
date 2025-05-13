import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createArchive, writeArchive, readArchive, extractArchive, archiveDirectory, unarchiveFile } from '../src/archive.js';

const TEST_DIR = path.join(__dirname, 'tmp');
const ARCHIVE_PATH = path.join(TEST_DIR, 'test.dsap');
const EXTRACT_DIR = path.join(TEST_DIR, 'extracted');
const SAMPLE_FILE = path.join(TEST_DIR, 'sample.txt');
const SAMPLE_CONTENT = 'Hello, archive!';

function cleanTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

describe('archive.ts', () => {
  beforeEach(() => {
    cleanTestDir();
    fs.writeFileSync(SAMPLE_FILE, SAMPLE_CONTENT);
  });

  it('should create an archive from a directory', async () => {
    const archive = await createArchive(TEST_DIR);
    expect(archive).toBeDefined();
    expect(archive.entries.length).toBeGreaterThan(0);
    const entry = archive.entries.find((e: { path: string }) => e.path === 'sample.txt');
    expect(entry).toBeDefined();
    expect(entry?.data.toString()).toBe(SAMPLE_CONTENT);
  });

  it('should write and read an archive file', async () => {
    const archive = await createArchive(TEST_DIR);
    await writeArchive(archive, ARCHIVE_PATH);
    expect(fs.existsSync(ARCHIVE_PATH)).toBe(true);
    const loaded = await readArchive(ARCHIVE_PATH);
    expect(loaded.entries.length).toBe(archive.entries.length);

    expect(loaded.entries[0].data.equals(archive.entries[0].data)).toBe(true);
  });

  it('should extract an archive to a directory', async () => {
    const archive = await createArchive(TEST_DIR);
    await writeArchive(archive, ARCHIVE_PATH);
    const loaded = await readArchive(ARCHIVE_PATH);
    await extractArchive(loaded, EXTRACT_DIR);
    const extractedFile = path.join(EXTRACT_DIR, 'sample.txt');
    expect(fs.existsSync(extractedFile)).toBe(true);
    expect(fs.readFileSync(extractedFile, 'utf8')).toBe(SAMPLE_CONTENT);
  });

  it('should archive and write using archiveDirectory', async () => {
    await archiveDirectory(TEST_DIR, ARCHIVE_PATH);
    expect(fs.existsSync(ARCHIVE_PATH)).toBe(true);
    const loaded = await readArchive(ARCHIVE_PATH);
    const entry = loaded.entries.find((e: { path: string }) => e.path === 'sample.txt');
    expect(entry).toBeDefined();
    expect(entry?.data.toString()).toBe(SAMPLE_CONTENT);
  });

  it('should extract archive file using unarchiveFile', async () => {
    // Create and archive test files
    await archiveDirectory(TEST_DIR, ARCHIVE_PATH);
    expect(fs.existsSync(ARCHIVE_PATH)).toBe(true);

    // Clean extract directory to ensure fresh test
    if (fs.existsSync(EXTRACT_DIR)) {
      fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
    }

    // Test unarchiveFile function
    await unarchiveFile(ARCHIVE_PATH, EXTRACT_DIR);

    // Verify files were extracted correctly
    const extractedFile = path.join(EXTRACT_DIR, 'sample.txt');
    expect(fs.existsSync(extractedFile)).toBe(true);
    expect(fs.readFileSync(extractedFile, 'utf8')).toBe(SAMPLE_CONTENT);
  });

  it('should throw when unarchiving a non-existent archive file', async () => {
    const nonExistentPath = path.join(TEST_DIR, 'nonexistent.dsap');
    await expect(unarchiveFile(nonExistentPath, EXTRACT_DIR)).rejects.toThrow();
  });

  it('throws if source directory does not exist', async () => {
    await expect(createArchive('/nonexistent')).rejects.toThrow();
  });

  it('throws if source path is not a directory', async () => {
    await expect(createArchive(SAMPLE_FILE)).rejects.toThrow('Source path is not a directory');
  });

  it('throws if archive has invalid signature', async () => {
    // Create invalid archive file with wrong signature
    const buffer = Buffer.alloc(16);
    buffer.write('INVALID', 0); // Wrong signature
    buffer.writeUInt32LE(1, 4); // Version
    buffer.writeUInt32LE(0, 8); // Entries count
    await fs.promises.writeFile(ARCHIVE_PATH, buffer);

    await expect(readArchive(ARCHIVE_PATH)).rejects.toThrow('Invalid archive signature');
  });

  it('throws if archive has unsupported version', async () => {
    // Create archive file with unsupported version
    const buffer = Buffer.alloc(16);
    buffer.write('DSAP', 0); // Correct signature
    buffer.writeUInt32LE(999, 4); // Unsupported version
    buffer.writeUInt32LE(0, 8); // Entries count
    await fs.promises.writeFile(ARCHIVE_PATH, buffer);

    await expect(readArchive(ARCHIVE_PATH)).rejects.toThrow('Unsupported archive version: 999');
  });

  it('should respect custom include/exclude patterns', async () => {
    // Create additional test files
    const EXCLUDED_FILE = path.join(TEST_DIR, 'excluded.txt');
    fs.writeFileSync(EXCLUDED_FILE, 'This should be excluded');

    const INCLUDED_FILE = path.join(TEST_DIR, 'included.txt');
    fs.writeFileSync(INCLUDED_FILE, 'This should be included');

    // Create archive with custom include/exclude patterns
    const archive = await createArchive(TEST_DIR, {
      include: ['**/*.txt'],
      exclude: ['**/excluded.txt']
    });

    // Verify included/excluded files
    expect(archive.entries.length).toBeGreaterThan(0);

    const includedEntry = archive.entries.find((e: { path: string }) => e.path === 'included.txt');
    expect(includedEntry).toBeDefined();
    expect(includedEntry?.data.toString()).toBe('This should be included');

    const excludedEntry = archive.entries.find((e: { path: string }) => e.path === 'excluded.txt');
    expect(excludedEntry).toBeUndefined();
  });

  it('should detect and block path traversal attempts', async () => {
    // Create a malicious archive with a path traversal entry
    const maliciousArchive = {
      version: 1,
      entries: [{
        path: '../malicious.js', // Simple path traversal attempt
        size: 26,
        mimeType: 'application/javascript',
        data: Buffer.from('console.log("Malicious!");')
      }]
    };

    // Attempt to extract the archive
    await expect(extractArchive(maliciousArchive, EXTRACT_DIR))
      .rejects.toThrow('Blocked path traversal attempt: ../malicious.js');

    // Check that no file was created outside the target directory
    const maliciousFilePath = path.join(path.dirname(EXTRACT_DIR), 'malicious.js');
    expect(fs.existsSync(maliciousFilePath)).toBe(false);
  });

  it('should block complex path traversal attempts', async () => {
    // Create a malicious archive with a complex path traversal entry
    const maliciousArchive = {
      version: 1,
      entries: [{
        path: 'legitimate/../../malicious.js', // Complex path traversal attempt
        size: 26,
        mimeType: 'application/javascript',
        data: Buffer.from('console.log("Malicious!");')
      }]
    };

    // Attempt to extract the archive
    await expect(extractArchive(maliciousArchive, EXTRACT_DIR))
      .rejects.toThrow('Blocked path traversal attempt: legitimate/../../malicious.js');

    // Check that no file was created outside the target directory
    const maliciousFilePath = path.join(path.dirname(EXTRACT_DIR), 'malicious.js');
    expect(fs.existsSync(maliciousFilePath)).toBe(false);
  });
});
