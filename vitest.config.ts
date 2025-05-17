import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['vitest/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      provider: 'istanbul',
      exclude: [
        'tools/**',
        '**/node_modules/**',
        'dist/**',
        '**/vitest/**',
        '**/*.js',
        '**/*.d.ts'
      ],
      include: [
        'src/**/*.ts'
      ]
    },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.js'],
  },
});
