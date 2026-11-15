import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { RefProxy } from 'pdfjs-dist/types/src/display/api.js';
import { describe, expect, test } from 'vitest';

import record from '../../src/data/manual-pdf.json' with { type: 'json' };
import { manualPdf } from '../../src/data/manual.ts';
import { dictionaries } from '../../src/i18n/index.ts';
import { locales } from '../../src/i18n/locales.ts';
import { chapters } from './manual-content.ts';

/** A PDF has no spaces of its own between pieces of text, so the tests compare text without spaces. */
const dense = (text: string): string => text.replace(/\s+/g, '');

describe.each(locales)('PDF of the manual (%s)', (locale) => {
  const open = async () => {
    const data = new Uint8Array(readFileSync(join(process.cwd(), 'public', manualPdf(locale))));
    const task = getDocument({ data, useSystemFonts: true });
    return { task, document: await task.promise };
  };

  test('the file has a title, a language and the recorded number of pages', async () => {
    const { task, document } = await open();
    const { info } = await document.getMetadata();
    expect(info).toMatchObject({ Title: `Fajnovka · ${dictionaries[locale].manual.title}`, Language: locale });
    expect(document.numPages).toBe(record[locale].pages);
    await task.destroy();
  });

  test('the bookmarks list the contents and each chapter', async () => {
    const { task, document } = await open();
    const [cover] = await document.getOutline();
    const chaptersOf = (cover?.items ?? []) as { title: string }[];
    const titles = chaptersOf.map((item) => dense(item.title));
    expect(titles).toEqual(
      [dictionaries[locale].manual.contents, ...chapters[locale].map(({ title }) => title)].map(dense),
    );
    await task.destroy();
  });

  test('the contents give the page on which each chapter starts', async () => {
    const { task, document } = await open();
    const contents = await (await document.getPage(2)).getTextContent();
    const printed = dense(contents.items.map((item) => ('str' in item ? item.str : '')).join(''));
    const expected = await Promise.all(
      chapters[locale].map(async ({ name, order, title }) => {
        const [reference] = (await document.getDestination(name.replace(/^\d+-/, ''))) as [RefProxy];
        const start = (await document.getPageIndex(reference)) + 1;
        return dense(`${order}${title}${start}`);
      }),
    );
    expect(printed).toContain(expected.join(''));
    await task.destroy();
  });
});
