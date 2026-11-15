import { defineConfig } from 'vitest/config';

/** Unit tests: the pure code in src/lib, the data, the dictionaries and the text of the manual. */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // The pure code has a test for each line and each branch. The browser tests cover the scripts of the pages.
      include: ['src/lib/**/*.ts'],
      thresholds: { 100: true },
      reporter: ['text-summary', 'html'],
    },
  },
});
