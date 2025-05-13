#!/usr/bin/env node

/**
 * This script updates the version placeholder in the compiled code
 * with the actual version from package.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Read package.json
const packageJsonPath = path.join(rootDir, 'package.json');
let packageJson;
try {
  const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  console.error(`Error reading package.json: ${error.message}`);
  process.exit(1);
}
const version = packageJson.version;

// Path to compiled version.js file
const versionFilePath = path.join(rootDir, 'dist', 'src', 'cli', 'version.js');

// Read the compiled file
let versionFileContent;
try {
  versionFileContent = fs.readFileSync(versionFilePath, 'utf8');
} catch (error) {
  console.error(`Error reading version file: ${error.message}`);
  console.error('Make sure you have built the project before running this script.');
  process.exit(1);
}

// Replace all occurrences of the version placeholder
const originalContent = versionFileContent;
versionFileContent = versionFileContent.replace(/['"]__VERSION__['"]/g, `'${version}'`);

// Verify replacement occurred
if (versionFileContent === originalContent) {
  console.error('Failed to replace version placeholder in the file.');
  console.error('Make sure the version.js file contains the __VERSION__ placeholder.');
  process.exit(1);
}

// Verify no placeholder remains
if (versionFileContent.includes('__VERSION__')) {
  console.warn('Warning: Not all version placeholders were replaced.');
  console.warn('Check for variant formats of the placeholder that might have been missed.');
}

// Write the updated file
try {
  fs.writeFileSync(versionFilePath, versionFileContent);
  console.log(`Version updated to ${version} in ${versionFilePath}`);
} catch (error) {
  console.error(`Error writing updated version file: ${error.message}`);
  process.exit(1);
}