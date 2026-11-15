import { defineConfig } from 'vitest/config';

/** Unit tests: the pure code in src/lib, the data, the dictionaries and the text of the manual. */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
