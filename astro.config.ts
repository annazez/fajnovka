import { satteri } from '@astrojs/markdown-satteri';
import { defineConfig, fontProviders } from 'astro/config';

import { defaultLocale, locales } from './src/i18n/locales.ts';
import { manualMarkdown } from './src/lib/markdown.ts';

type UnicodeRange = [string, ...string[]];

/** Montserrat ships as one file for each Unicode subset. One font family for each file makes selective preload possible. */
function montserrat(subset: 'latin' | 'latin-ext', name: string, cssVariable: string, unicodeRange: UnicodeRange) {
  const variants: [{ src: [string]; weight: string; style: 'normal'; unicodeRange: UnicodeRange }] = [
    {
      src: [`@fontsource-variable/montserrat/files/montserrat-${subset}-wght-normal.woff2`],
      weight: '100 900',
      style: 'normal',
      unicodeRange,
    },
  ];
  return { provider: fontProviders.local(), name, cssVariable, fallbacks: ['system-ui', 'sans-serif'], options: { variants } };
}

export default defineConfig({
  site: 'https://fajnovka.zezulka.me',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  i18n: { locales: [...locales], defaultLocale },
  build: { inlineStylesheets: 'always' },
  markdown: { processor: satteri({ hastPlugins: [manualMarkdown] }) },
  fonts: [
    montserrat('latin', 'Montserrat', '--font-montserrat', [
      'U+0000-00FF',
      'U+0131',
      'U+0152-0153',
      'U+02BB-02BC',
      'U+02C6',
      'U+02DA',
      'U+02DC',
      'U+0304',
      'U+0308',
      'U+0329',
      'U+2000-206F',
      'U+20AC',
      'U+2122',
      'U+2191',
      'U+2193',
      'U+2212',
      'U+2215',
      'U+FEFF',
      'U+FFFD',
    ]),
    montserrat('latin-ext', 'Montserrat Ext', '--font-montserrat-ext', [
      'U+0100-02BA',
      'U+02BD-02C5',
      'U+02C7-02CC',
      'U+02CE-02D7',
      'U+02DD-02FF',
      'U+1D00-1DBF',
      'U+1E00-1E9F',
      'U+1EF2-1EFF',
      'U+2020',
      'U+20A0-20AB',
      'U+20AD-20C0',
      'U+2113',
      'U+2C60-2C7F',
      'U+A720-A7FF',
    ]),
  ],
  vite: {
    css: {
      transformer: 'lightningcss',
      lightningcss: { drafts: { customMedia: true } },
    },
    build: { cssMinify: 'lightningcss' },
  },
});
