import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '*.config.*',
        '**/*.d.ts',
      ],
    },
    css: true,
    isolate: true,
    threads: true,
  },
  resolve: {
    conditions: ['development', 'browser'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});