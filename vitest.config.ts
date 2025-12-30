import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'clover', 'cobertura'],
      reportsDirectory: 'coverage',
      exclude: [
        'node_modules',
        'dist',
        'test',
        '**/*.d.ts',
        '**/index.ts',
        'src/interfaces/**',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    reporters: ['default'],
    clearMocks: true,
    testTimeout: 10000,
  },
});
