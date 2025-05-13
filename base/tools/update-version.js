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
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Path to compiled version.js file
const versionFilePath = path.join(rootDir, 'dist', 'src', 'cli', 'version.js');

// Read the compiled file
let versionFileContent = fs.readFileSync(versionFilePath, 'utf8');

// Replace the version placeholder
versionFileContent = versionFileContent.replace(/'__VERSION__'/, `'${version}'`);

// Write the updated file
fs.writeFileSync(versionFilePath, versionFileContent);