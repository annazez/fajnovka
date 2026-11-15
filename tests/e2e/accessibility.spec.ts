import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { LOCALES, SLIDES, home, openDeck } from './support.ts';

/** WCAG 2.2, levels A and AA, with the rules of the older versions. */
const RULES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The problems that axe finds on the page, one line for each element. */
async function problems(page: Page): Promise<string[]> {
  const { violations, passes } = await new AxeBuilder({ page }).withTags(RULES).analyze();
  // A scan that checks nothing finds nothing: the page must pass a good number of rules.
  expect(passes.length).toBeGreaterThan(10);
  return violations.flatMap(({ id, help, nodes }) =>
    nodes.map(({ target, failureSummary }) => `${id} (${help}) at ${target.join(' ')}: ${failureSummary ?? ''}`),
  );
}

for (const locale of LOCALES) {
  test.describe(`accessibility (${locale})`, () => {
    for (const [index, id] of SLIDES.entries()) {
      test(`slide ${index + 1} (${id}) has no WCAG 2.2 AA problem`, async ({ page }) => {
        // Without motion, the slide shows its last state at once.
        await openDeck(page, { locale, slide: index + 1, motion: false });
        expect(await problems(page)).toEqual([]);
      });
    }

    test('the manual has no WCAG 2.2 AA problem', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`${home(locale)}manual/`);
      await expect(page.locator('h1')).toBeVisible();
      expect(await problems(page)).toEqual([]);
    });
  });
}
