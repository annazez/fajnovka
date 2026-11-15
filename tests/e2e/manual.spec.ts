import { expect, test } from '@playwright/test';

import record from '../../src/data/manual-pdf.json' with { type: 'json' };
import { manualSignature } from '../../scripts/signature.ts';
import { LOCALES, home, isPhone, openDeck, watchPage, type Locale } from './support.ts';

const CHAPTERS = 15;
const CHARTS = 8;
const manual = (locale: Locale): string => `${home(locale)}manual/`;
const pdf = (locale: Locale): string => `/manual/fajnovka-manual-${locale}.pdf`;

for (const locale of LOCALES) {
  test.describe(`manual (${locale})`, () => {
    test('the page has a cover, the contents and each chapter', async ({ page }) => {
      const { problems } = watchPage(page);
      await page.goto(manual(locale));

      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.contents__list a')).toHaveCount(CHAPTERS);
      await expect(page.locator('section.chapter')).toHaveCount(CHAPTERS);

      const anchors = await page.locator('.contents__list a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      const chapters = await page.locator('section.chapter').evaluateAll((sections) => sections.map((section) => `#${section.id}`));
      expect(anchors).toEqual(chapters);
      expect(problems).toEqual([]);
    });

    test('a link in the contents opens its chapter', async ({ page }) => {
      await page.goto(manual(locale));
      await page.locator('.contents__list a').nth(6).click();
      await expect(page).toHaveURL(/#business-model$/);
      await expect(page.locator('#business-model h2')).toBeInViewport();
    });

    test('the page is not wider than the screen', async ({ page }) => {
      await page.goto(manual(locale));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });

    test('each chart has a size, a description and a caption', async ({ page }) => {
      await page.goto(manual(locale));
      const charts = page.locator('.figure');
      await expect(charts).toHaveCount(CHARTS);
      for (const chart of await charts.all()) {
        const box = await chart.locator('.chart').boundingBox();
        expect(box?.width).toBeGreaterThan(300);
        expect(box?.height).toBeGreaterThan(80);
        await expect(chart.locator('.chart')).toHaveAttribute('aria-label', /.{20,}/);
        await expect(chart.locator('figcaption')).not.toBeEmpty();
      }
    });

    test('a table or chart is a tab stop only while it scrolls sideways', async ({ page }, info) => {
      await page.goto(manual(locale));
      const frames = await page.locator('.scroll').evaluateAll((nodes) =>
        nodes.map((node) => ({ scrolls: node.scrollWidth > node.clientWidth, stop: node.getAttribute('tabindex') === '0', name: node.getAttribute('aria-label') })),
      );
      expect(frames.length).toBeGreaterThan(40);
      for (const frame of frames) {
        expect(frame.stop, frame.name ?? '').toBe(frame.scrolls);
        expect(frame.name).toBeTruthy();
      }
      // A phone is narrower than the wide tables. A projector is not.
      expect(frames.some((frame) => frame.scrolls)).toBe(isPhone(info));
    });

    test('the PDF link gives a PDF file', async ({ page, request }) => {
      await page.goto(manual(locale));
      const link = page.locator(`a[href="${pdf(locale)}"]`);
      await expect(link).toBeVisible();
      const response = await request.get(pdf(locale));
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/pdf');
      expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
    });

    test('the first slide of the deck opens the PDF', async ({ page }) => {
      await openDeck(page, { locale });
      const button = page.locator('#title .title__manual');
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('href', pdf(locale));
    });

    test('the PDF is a print of the page of today', async ({ page }, info) => {
      test.skip(info.project.name !== 'chromium', 'One engine is enough: the signature does not depend on the engine.');
      await page.goto(manual(locale));
      expect(
        await manualSignature(page),
        'The manual changed after the last print. Run `npm run manual:pdf`, then commit the PDF files and src/data/manual-pdf.json.',
      ).toBe(record[locale].signature);
    });
  });
}

test.describe('manual, both languages', () => {
  test('the languages link to each other and the bar leads back to the deck', async ({ page }) => {
    await page.goto(manual('en'));
    await page.locator('.bar__languages a[hreflang="cs"]').click();
    await expect(page).toHaveURL(/\/cs\/manual\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
    await expect(page.locator('.bar__languages a[aria-current="true"]')).toHaveText('CS');

    await page.locator('.bar a').first().click();
    await expect(page).toHaveURL(/\/cs\/(#1)?$/);
    await expect(page.locator('[data-deck]')).toBeVisible();
  });

  test('print gives A4 pages with the cover on the first page', async ({ page }, info) => {
    test.skip(info.project.name !== 'chromium', 'Only Chromium prints a PDF.');
    await page.goto(manual('en'));
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.bar')).toBeHidden();
    const cover = await page.locator('.cover').boundingBox();
    // 297 mm at 96 dpi.
    expect(Math.round(cover?.height ?? 0)).toBe(1123);
  });
});
