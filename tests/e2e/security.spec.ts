import { expect, test } from '@playwright/test';

import { LOCALES, SLIDES, expectSlide, home, openDeck, watchPage } from './support.ts';

const POLICY = 'meta[http-equiv="content-security-policy"]';
const pages = LOCALES.flatMap((locale) => [home(locale), `${home(locale)}manual/`]);

test.describe('content policy', () => {
  test.beforeEach(async ({ page }) => {
    // The browser reports each thing that the policy of a page stops. The report becomes an error on the console.
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        console.error(`Content policy: ${event.violatedDirective} stopped ${event.blockedURI}`);
      });
    });
  });

  for (const path of pages) {
    test(`${path} allows only the scripts and styles of the build`, async ({ page }) => {
      await page.goto(path);
      const policy = (await page.locator(POLICY).getAttribute('content')) ?? '';
      const directives = new Map(
        policy
          .split(';')
          .map((directive) => directive.trim().split(/\s+/))
          .map(([name = '', ...sources]) => [name, sources] as const),
      );

      expect(directives.get('default-src')).toEqual(["'none'"]);
      expect(directives.get('base-uri')).toEqual(["'none'"]);
      expect(directives.get('form-action')).toEqual(["'none'"]);
      for (const name of ['img-src', 'font-src', 'connect-src']) expect(directives.get(name), name).toEqual(["'self'"]);
      // A script or a style comes from the site itself, or the build knows its hash.
      for (const name of ['script-src', 'style-src']) {
        const sources = directives.get(name) ?? [];
        expect(sources[0], name).toBe("'self'");
        expect(sources.length, name).toBeGreaterThan(1);
        for (const source of sources.slice(1)) expect(source, name).toMatch(/^'sha256-[\w+/]+=*'$/);
      }
    });
  }

  test('the deck breaks no rule of its policy', async ({ page }) => {
    const { problems } = watchPage(page);
    await openDeck(page, { motion: true });
    for (let slide = 2; slide <= SLIDES.length; slide += 1) {
      await page.keyboard.press('ArrowRight');
      await expectSlide(page, slide);
    }
    await page.keyboard.press('p');
    expect(problems).toEqual([]);
  });

  test('the manual breaks no rule of its policy', async ({ page }) => {
    const { problems } = watchPage(page);
    await page.goto('/manual/');
    await page.locator('section.chapter').last().scrollIntoViewIfNeeded();
    await expect(page.locator('section.chapter').last()).toBeInViewport();
    expect(problems).toEqual([]);
  });

  test('the policy stops a script that the build did not make', async ({ page }) => {
    await page.goto('/');
    const ran = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'document.documentElement.dataset.foreign = "ran"';
      document.head.append(script);
      return document.documentElement.dataset.foreign === 'ran';
    });
    expect(ran).toBe(false);
  });

  test('the policy stops a style that the build did not make', async ({ page }) => {
    await page.goto('/');
    const applied = await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = 'html { outline: 7px solid red }';
      document.head.append(style);
      return getComputedStyle(document.documentElement).outlineWidth === '7px';
    });
    expect(applied).toBe(false);
  });
});
