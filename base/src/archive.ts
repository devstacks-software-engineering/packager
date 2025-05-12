import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { glob } from 'glob';
import mime from 'mime-types';
import { Archive, ArchiveEntry, ArchiveOptions } from './types.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

/**
 * Current archive format version
 */
const ARCHIVE_VERSION = 1;

/**
 * Archive file signature
 */
const ARCHIVE_SIGNATURE = Buffer.from('DSAP'); // DevStacks Archiver Package

/**
 * Archive header size in bytes
 */
const HEADER_SIZE = 8; // 4 bytes signature + 4 bytes version

/**
 * Creates an archive from a directory
 * @param sourcePath Absolute path to the directory to archive
 * @param options Archive options
 * @returns Archive object
 */
export async function createArchive(
  sourcePath: string,
  options: ArchiveOptions = {}
): Promise<Archive> {
  // Ensure sourcePath is absolute
  sourcePath = path.resolve(sourcePath);

  // Check if source path exists
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source path does not exist: ${sourcePath}`);
  }

  // Get stats for source path
  const stats = await stat(sourcePath);
  if (!stats.isDirectory()) {
    throw new Error(`Source path is not a directory: ${sourcePath}`);
  }

  // Define default include/exclude patterns
  const include = options.include || ['**/*'];
  const exclude = options.exclude || ['**/node_modules/**', '**/.git/**'];

  // Find all files to include in the archive
  const files = await glob(include, {
    cwd: sourcePath,
    ignore: exclude,
    nodir: true,
    absolute: true,
  });

  // Create archive entries
  const entries: ArchiveEntry[] = [];

  for (const file of files) {
    // Get file stats
    const fileStats = await stat(file);

    // Get relative path
    const relativePath = path.relative(sourcePath, file);

    // Get MIME type
    const mimeType = mime.lookup(file) || 'application/octet-stream';

    // Read file data
    const data = await readFile(file);

    // Create entry
    entries.push({
      path: relativePath,
      size: fileStats.size,
      mimeType,
      data,
    });
  }

  // Create archive
  return {
    version: ARCHIVE_VERSION,
    entries,
  };
}

/**
 * Writes an archive to a file
 * @param archive Archive object
 * @param outputPath Path to write the archive
 */
export async function writeArchive(
  archive: Archive,
  outputPath: string
): Promise<void> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Calculate total size of the archive
  let totalSize = HEADER_SIZE + 4; // 4 bytes for number of entries after header

  // Calculate size for entries table
  const entryTableSize = archive.entries.length * 8; // 4 bytes offset + 4 bytes length
  totalSize += entryTableSize;

  // Calculate size for entry metadata
  for (const entry of archive.entries) {
    // 2 bytes path length + path + 4 bytes size + 2 bytes mime type length + mime type
    totalSize += 2 + Buffer.byteLength(entry.path) + 4 + 2 + Buffer.byteLength(entry.mimeType);
  }

  // Calculate size for entry data
  for (const entry of archive.entries) {
    totalSize += entry.data.length;
  }

  // Create buffer for archive
  const buffer = Buffer.alloc(totalSize);

  // Write header
  ARCHIVE_SIGNATURE.copy(buffer, 0);
  buffer.writeUInt32LE(archive.version, 4);

  // Write number of entries
  buffer.writeUInt32LE(archive.entries.length, HEADER_SIZE);

  // Starting offset for entry data (header + 4 bytes for numEntries + entryTable)
  let currentOffset = HEADER_SIZE + 4 + entryTableSize;

  // Write entry table and metadata
  for (let i = 0; i < archive.entries.length; i++) {
    const entry = archive.entries[i];
    const entryOffset = HEADER_SIZE + 4 + i * 8;

    // Write entry offset
    buffer.writeUInt32LE(currentOffset, entryOffset);

    // Write entry data size
    const metadataSize = 2 + Buffer.byteLength(entry.path) + 4 + 2 + Buffer.byteLength(entry.mimeType);
    const entrySize = metadataSize + entry.data.length;
    buffer.writeUInt32LE(entrySize, entryOffset + 4);

    // Write path length
    buffer.writeUInt16LE(Buffer.byteLength(entry.path), currentOffset);
    currentOffset += 2;

    // Write path
    buffer.write(entry.path, currentOffset);
    currentOffset += Buffer.byteLength(entry.path);

    // Write size
    buffer.writeUInt32LE(entry.size, currentOffset);
    currentOffset += 4;

    // Write mime type length
    buffer.writeUInt16LE(Buffer.byteLength(entry.mimeType), currentOffset);
    currentOffset += 2;

    // Write mime type
    buffer.write(entry.mimeType, currentOffset);
    currentOffset += Buffer.byteLength(entry.mimeType);

    // Write data
    entry.data.copy(buffer, currentOffset);
    currentOffset += entry.data.length;
  }

  // Write archive to file
  await writeFile(outputPath, buffer);
}

/**
 * Reads an archive from a file
 * @param archivePath Path to the archive file
 * @returns Archive object
 */
export async function readArchive(archivePath: string): Promise<Archive> {
  // Read archive file
  const buffer = await readFile(archivePath);

  // Check signature
  const signature = buffer.slice(0, 4);
  if (!signature.equals(ARCHIVE_SIGNATURE)) {
    throw new Error('Invalid archive signature');
  }

  // Read version
  const version = buffer.readUInt32LE(4);
  if (version !== ARCHIVE_VERSION) {
    throw new Error(`Unsupported archive version: ${version}`);
  }

  // Read number of entries
  const numEntries = buffer.readUInt32LE(8);

  // Read entries
  const entries: ArchiveEntry[] = [];

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = HEADER_SIZE + 4 + i * 8;
    const dataOffset = buffer.readUInt32LE(entryOffset);

    // Read path length
    const pathLength = buffer.readUInt16LE(dataOffset);

    // Read path
    const path = buffer.toString('utf8', dataOffset + 2, dataOffset + 2 + pathLength);

    // Read size
    const size = buffer.readUInt32LE(dataOffset + 2 + pathLength);

    // Read mime type length
    const mimeTypeLength = buffer.readUInt16LE(dataOffset + 2 + pathLength + 4);

    // Read mime type
    const mimeType = buffer.toString('utf8', dataOffset + 2 + pathLength + 4 + 2, dataOffset + 2 + pathLength + 4 + 2 + mimeTypeLength);

    // Read data
    const dataStart = dataOffset + 2 + pathLength + 4 + 2 + mimeTypeLength;
    const data = Buffer.from(buffer.slice(dataStart, dataStart + size));

    // Create entry
    entries.push({
      path,
      size,
      mimeType,
      data,
    });
  }

  // Create archive
  return {
    version,
    entries,
  };
}

/**
 * Extracts an archive to a directory
 * @param archive Archive object
 * @param outputPath Path to extract the archive
 */
export async function extractArchive(
  archive: Archive,
  outputPath: string
): Promise<void> {
  // Ensure output directory exists
  await mkdir(outputPath, { recursive: true });

  // Extract entries
  for (const entry of archive.entries) {
    // Create full path
    const fullPath = path.join(outputPath, entry.path);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(fullPath, entry.data);
  }
}

/**
 * Creates and writes an archive from a directory
 * @param sourcePath Absolute path to the directory to archive
 * @param outputPath Path to write the archive
 * @param options Archive options
 */
export async function archiveDirectory(
  sourcePath: string,
  outputPath: string,
  options: ArchiveOptions = {}
): Promise<void> {
  const archive = await createArchive(sourcePath, options);
  await writeArchive(archive, outputPath);
}

/**
 * Extracts an archive file to a directory
 * @param archivePath Path to the archive file
 * @param outputPath Path to extract the archive
 */
export async function unarchiveFile(
  archivePath: string,
  outputPath: string
): Promise<void> {
  const archive = await readArchive(archivePath);
  await extractArchive(archive, outputPath);
}