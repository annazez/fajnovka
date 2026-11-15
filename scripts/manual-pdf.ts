/**
 * Makes the PDF of the manual in each language: public/manual/fajnovka-manual-<language>.pdf.
 *
 * Usage: npm run manual:pdf
 *
 * The PDF is a print of the manual page in Chromium. The script prints each language two times:
 * the first print shows on which page each chapter starts, and the second print has these page numbers in the contents.
 * It also writes src/data/manual-pdf.json with the signature of the printed page (see signature.ts).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { build, preview } from 'astro';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { locales, localePath } from '../src/i18n/locales.ts';
import { manualSignature } from './signature.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4399;
const PRINT = { printBackground: true, preferCSSPageSize: true, tagged: true, outline: true } as const;

interface Layout {
  /** Number of pages. */
  total: number;
  /** The page on which each chapter starts, by the anchor of the chapter. */
  starts: Record<string, number>;
}

async function layoutOf(pdf: Uint8Array, anchors: readonly string[]): Promise<Layout> {
  const task = getDocument({ data: new Uint8Array(pdf), useSystemFonts: true });
  const document = await task.promise;
  const starts: Record<string, number> = {};
  for (const anchor of anchors) {
    const destination = await document.getDestination(anchor);
    if (!destination) throw new Error(`The PDF has no destination for the chapter "${anchor}".`);
    starts[anchor] = (await document.getPageIndex(destination[0])) + 1;
  }
  const total = document.numPages;
  await task.destroy();
  return { total, starts };
}

await build({ root, logLevel: 'warn' });
const server = await preview({ root, logLevel: 'warn', server: { host: '127.0.0.1', port: PORT } });
const browser = await chromium.launch();
const record: Record<string, { pages: number; signature: string }> = {};

try {
  await mkdir(new URL('../public/manual/', import.meta.url), { recursive: true });

  for (const locale of locales) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${localePath(locale, '/manual/')}`, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts.ready);
    const signature = await manualSignature(page);

    const numbers = page.locator('[data-page-of]');
    const anchors = await numbers.evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.pageOf ?? ''));
    const draft = await layoutOf(await page.pdf(PRINT), anchors);
    await numbers.evaluateAll((nodes, starts) => {
      for (const node of nodes) node.textContent = String(starts[(node as HTMLElement).dataset.pageOf ?? '']);
    }, draft.starts);

    const pdf = await page.pdf(PRINT);
    const final = await layoutOf(pdf, anchors);
    if (JSON.stringify(final) !== JSON.stringify(draft)) {
      throw new Error(`The page numbers of the ${locale} manual changed between the two prints.`);
    }

    const file = `public/manual/fajnovka-manual-${locale}.pdf`;
    await writeFile(new URL(`../${file}`, import.meta.url), pdf);
    record[locale] = { pages: final.total, signature };
    console.log(`${file}: ${final.total} pages, ${Math.round(pdf.length / 1024)} kB`);
    await page.close();
  }

  await writeFile(new URL('../src/data/manual-pdf.json', import.meta.url), `${JSON.stringify(record, null, 2)}\n`);
} finally {
  await browser.close();
  await server.stop();
}
