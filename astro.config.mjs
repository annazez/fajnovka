// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fajnovka.zezulka.me',
  devToolbar: { enabled: false },
  build: { inlineStylesheets: 'always' },
});
