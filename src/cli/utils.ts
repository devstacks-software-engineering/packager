import chalk from 'chalk';
import ora, { Ora } from 'ora';
import fs from 'node:fs';
import path from 'node:path';
import { formatFileSize } from '../utils.js';

/**
 * Displays a success message
 * @param message Success message
 */
export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

/**
 * Displays an error message
 * @param message Error message
 */
export function error(message: string): void {
  console.error(chalk.red(`✗ ${message}`));
}

/**
 * Displays an info message
 * @param message Info message
 */
export function info(message: string): void {
  console.log(chalk.blue(`ℹ ${message}`));
}

/**
 * Displays a warning message
 * @param message Warning message
 */
export function warning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Creates a spinner with the specified text
 * @param text Spinner text
 * @returns Ora spinner instance
 */
export function createSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  });
}

/**
 * Validates that a path exists
 * @param path Path to validate
 * @param type Expected type ('file' or 'directory')
 * @returns Whether the path exists and is of the correct type
 */
export function validatePath(path: string, type: 'file' | 'directory'): boolean {
  try {
    const stats = fs.statSync(path);

    if (type === 'file' && !stats.isFile()) {
      error(`Path is not a file: ${path}`);
      return false;
    }

    if (type === 'directory' && !stats.isDirectory()) {
      error(`Path is not a directory: ${path}`);
      return false;
    }

    return true;
  } catch {
    error(`Path does not exist: ${path}`);
    return false;
  }
}

/**
 * Gets file information
 * @param filePath Path to the file
 * @returns Object with file information or null if file doesn't exist
 */
export function getFileInfo(filePath: string): {
  size: number;
  formattedSize: string;
  extension: string;
  basename: string;
  dirname: string;
} | null {
  try {
    const stats = fs.statSync(filePath);

    return {
      size: stats.size,
      formattedSize: formatFileSize(stats.size),
      extension: path.extname(filePath),
      basename: path.basename(filePath),
      dirname: path.dirname(filePath),
    };
  } catch {
    return null;
  }
}