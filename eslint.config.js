// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Lint rules. The strict sets of typescript-eslint find real errors (unsafe values, promises that nobody waits for).
 * Prettier owns the layout of the code, so there are no layout rules here.
 */
export default defineConfig(
  globalIgnores(['dist/', '.astro/', 'coverage/', 'playwright-report/', 'test-results/', '.vercel/']),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  astro.configs.recommended,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A number in a template text is clear. Other values need an explicit conversion.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `() => deck.next()` is the short form of a handler. A longer function must not return the result of a void call.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // `value || 'default'` is correct for a text: an empty text also takes the default.
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true } }],
      // `_` is the name of a parameter that the function does not use.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_$' }],
    },
  },

  // Code that runs in the browser, and tests that run code in the browser.
  {
    files: ['src/scripts/**', 'src/slides/**', 'src/components/**', 'tests/e2e/**'],
    languageOptions: { globals: globals.browser },
  },
  // Code that runs in Node: the build, the tools and the tests.
  {
    files: ['*.{js,ts}', 'scripts/**', 'api/**', 'tests/**', 'src/lib/site.ts'],
    languageOptions: { globals: globals.node },
  },

  // The parser of Astro files does not give types to the rules, so the rules that need types are off there.
  { files: ['**/*.astro', '**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
  // Astro makes its types available with a reference line.
  { files: ['**/*.d.ts'], rules: { '@typescript-eslint/triple-slash-reference': 'off' } },
);
