import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a compatibility instance
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Extend recommended configurations
  js.configs.recommended,
  ...compat.config({
    extends: ['plugin:@typescript-eslint/recommended'],
  }),
  {
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    files: ['**/*.ts'],
    rules: {
      // Enforce 2 spaces for indentation
      'indent': ['error', 2],
      
      // Enforce single quotes
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      
      // Enforce semicolons
      'semi': ['error', 'always'],
      
      // Enforce consistent spacing after the // or /* in a comment
      'spaced-comment': ['error', 'always'],
      
      // Enforce spacing after commas
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      
      // Enforce use of const when variable is not reassigned
      'prefer-const': 'error',
      
      // Disallow unused variables (TypeScript has its own rule)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      
      // Enforce consistent line breaks
      'linebreak-style': ['error', 'unix'],
      
      // Enforce consistent brace style
      'brace-style': ['error', '1tbs'],
      
      // Maximum line length
      'max-len': ['error', { 'code': 140, 'ignoreComments': true }],
      
      // No multiple empty lines
      'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 1 }],
      
      // Require space before blocks
      'space-before-blocks': ['error', 'always'],
      
      // Disallow trailing whitespace at the end of lines
      'no-trailing-spaces': 'error',
      
      // Require or disallow space before function parenthesis
      'space-before-function-paren': ['error', {
        'anonymous': 'never',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      
      // Require or disallow space before/after arrow function's arrow
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      
      // Allow explicit any as a last resort
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Configuration specific to test files
  {
    files: ['vitest/**/*.ts', '**/*.test.ts', '**/*.spec.ts'], // Target test files
    rules: {
      // Allow 'any' type in test files for easier mocking
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'jest.config.js'],
  },
];