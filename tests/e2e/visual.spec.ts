import { expect, test } from '@playwright/test';

import { LOCALES, SLIDES, deck, openDeck } from './support.ts';

/**
 * The picture of each slide, as a projector and a phone show it.
 * Chromium on the CI machine draws the reference pictures. Each machine draws letters a little differently,
 * so the comparison runs only there. After a change of the design, run the workflow "Update the pictures".
 */
test.describe('pictures of the slides', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium draws the reference pictures.');
  test.skip(!process.env.CI, 'The reference pictures come from the CI machine.');

  for (const locale of LOCALES) {
    for (const [index, id] of SLIDES.entries()) {
      test(`slide ${index + 1} (${id}, ${locale}) looks like its reference picture`, async ({ page }) => {
        // Without motion, a slide shows one still picture.
        await openDeck(page, { locale, slide: index + 1, motion: false });
        await page.evaluate(() => document.fonts.ready);
        // The picture of a talk: nobody moves the pointer, so the buttons of the stage are away.
        await expect(deck(page)).toHaveClass(/is-idle/);
        // The scenes stand still, but they stay in their place: Playwright must not reset them.
        await expect(page).toHaveScreenshot(`${id}-${locale}.png`, { animations: 'allow' });
      });
    }
  }
});
