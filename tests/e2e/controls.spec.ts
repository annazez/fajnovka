import { expect, test, type Page } from '@playwright/test';

import { active, deck, expectSlide, home, isPhone, openDeck } from './support.ts';

test.describe('motion switch', () => {
  test('the button and the key P pause and resume the animations', async ({ page }, info) => {
    await openDeck(page, { motion: true });
    const button = page.locator('[data-action="motion"]');
    const running = (): Promise<string[]> =>
      page.evaluate(() => [...new Set(document.getAnimations().map((animation) => animation.playState))]);

    await expect(deck(page)).toHaveAttribute('data-motion', 'running');
    await expect(button).toHaveAccessibleName('Pause the animations');
    await expect.poll(running).toEqual(['running']);

    if (isPhone(info)) await button.tap();
    else await button.click();
    await expect(deck(page)).toHaveAttribute('data-motion', 'paused');
    await expect(button).toHaveAccessibleName('Play the animations');
    await expect.poll(running).toEqual(['paused']);

    await page.keyboard.press('p');
    await expect(deck(page)).toHaveAttribute('data-motion', 'running');
    await expect.poll(running).toEqual(['running']);
  });

  /** Play states of the animations that the scene of the title slide made. */
  const sceneStates = (page: Page): Promise<string[]> =>
    page.evaluate(() =>
      [...document.querySelectorAll('#title [data-built]')].flatMap((node) => node.getAnimations().map((animation) => animation.playState)),
    );

  test('the deck starts paused when the system asks for reduced motion', async ({ page }) => {
    await openDeck(page, { motion: false });
    await expect(deck(page)).toHaveAttribute('data-motion', 'paused');
    await expect.poll(async () => (await sceneStates(page)).length).toBeGreaterThan(10);
    await expect.poll(async () => [...new Set(await sceneStates(page))]).toEqual(['paused']);
  });

  test('the scene of a slide stops when the slide leaves', async ({ page }) => {
    await openDeck(page, { motion: true });
    await expect.poll(async () => [...new Set(await sceneStates(page))]).toEqual(['running']);
    await page.keyboard.press('ArrowRight');
    await expectSlide(page, 2);
    await expect.poll(async () => [...new Set(await sceneStates(page))]).toEqual(['paused']);
  });
});

test.describe('full screen', () => {
  test('the button and the key F switch full screen', async ({ page, browserName }, info) => {
    test.skip(isPhone(info), 'The flow layout has no full-screen button.');
    test.skip(browserName === 'webkit', 'Headless WebKit has no fullscreen API.');
    await openDeck(page);
    const button = page.locator('[data-action="fullscreen"]');
    await expect(button).toHaveAccessibleName('Full screen');

    await button.click();
    await expect(deck(page)).toHaveClass(/is-fullscreen/);
    await expect(button).toHaveAccessibleName('Exit full screen');

    await page.keyboard.press('f');
    await expect(deck(page)).not.toHaveClass(/is-fullscreen/);
    await expect(button).toHaveAccessibleName('Full screen');
  });

  test('the screen stays awake in full screen', async ({ page, browserName }, info) => {
    test.skip(isPhone(info) || browserName !== 'chromium', 'Needs the fullscreen API and a wake-lock stub.');
    await page.addInitScript(() => {
      const calls: string[] = [];
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: (type: string) => {
            calls.push(type);
            return Promise.resolve({ release: () => Promise.resolve(calls.push('released')) });
          },
        },
      });
      Object.assign(window, { wakeLockCalls: calls });
    });
    await openDeck(page);
    await page.keyboard.press('f');
    await expect(deck(page)).toHaveClass(/is-fullscreen/);
    await page.keyboard.press('f');
    await expect(deck(page)).not.toHaveClass(/is-fullscreen/);
    expect(await page.evaluate(() => (window as unknown as { wakeLockCalls: string[] }).wakeLockCalls)).toEqual(['screen', 'released']);
  });
});

test.describe('speaker notes', () => {
  test('the key N shows the text of the slide and a timer', async ({ page }, info) => {
    test.skip(isPhone(info), 'Speaker notes need a keyboard.');
    await openDeck(page);
    const panel = page.locator('[data-notes-panel]');
    await expect(panel).toBeHidden();

    await page.keyboard.press('n');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-notes-text]')).toHaveText(/^Good afternoon\. We are the Fajnovka team\./);
    await expect(panel.locator('[data-notes-time]')).toHaveText('0:00');

    // The timer starts when the speaker leaves the first slide.
    await page.keyboard.press('ArrowRight');
    await expect(panel.locator('[data-notes-text]')).toHaveText(/258,764 people live within a 5-minute walk/);
    await expect(panel.locator('[data-notes-time]')).toHaveText('0:01', { timeout: 4000 });

    await page.keyboard.press('r');
    await expect(panel.locator('[data-notes-time]')).toHaveText('0:00');

    await page.keyboard.press('n');
    await expect(panel).toBeHidden();
  });

  test('each slide has speaker text and all of it fits in three minutes', async ({ page }) => {
    await openDeck(page);
    const notes = await page.locator('[data-slide]').evaluateAll((slides) => slides.map((slide) => slide.getAttribute('data-notes') ?? ''));
    expect(notes).toHaveLength(9);
    for (const text of notes) expect(text.length).toBeGreaterThan(40);
    // A calm speaker says about 140 words in a minute.
    const words = notes.join(' ').split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(420);
  });
});

test.describe('numbers', () => {
  test('a number counts up to its value when its slide enters', async ({ page }) => {
    await openDeck(page, { motion: true });
    await page.keyboard.press('2');
    const number = active(page).locator('[data-count]').first();
    await expect(number).not.toHaveText('258,764', { timeout: 1000 });
    await expect(number).toHaveText('258,764', { timeout: 6000 });
  });

  test('with reduced motion a number shows its value at once', async ({ page }) => {
    await openDeck(page);
    await page.keyboard.press('2');
    await expect(active(page).locator('[data-count]').first()).toHaveText('258,764', { timeout: 300 });
  });

  test('numbers use the format of the language', async ({ page }) => {
    await openDeck(page, { locale: 'cs', slide: 2 });
    await expect(active(page).locator('.t-hero').first()).toHaveText('258 764');
    await expect(active(page).locator('.t-hero').nth(1)).toHaveText('12 %');
    await page.keyboard.press('8');
    await expect(active(page).locator('.t-hero').first()).toHaveText('0,55 %');
    await expect(active(page).locator('dd strong').last()).toHaveText('2 220 Kč');
  });
});

test.describe('scenarios on the economics slide', () => {
  const figure = '[data-scenario]';

  test('the scenarios change by themselves until the first click', async ({ page }, info) => {
    await openDeck(page, { slide: 8, motion: true });
    await expect(page.locator(figure)).toHaveAttribute('data-scenario', 'base');
    await expect(page.locator(figure).locator('[data-year]:visible')).toHaveText('2034');

    await expect(page.locator(figure)).toHaveAttribute('data-scenario', 'better', { timeout: 6000 });
    await expect(page.locator(figure).locator('[data-year]:visible')).toHaveText('2030');
    await expect(page.locator(figure)).toHaveAttribute('data-scenario', 'worse', { timeout: 4000 });
    await expect(page.locator(figure).locator('[data-year]:visible')).toHaveText('2036+');

    const choose = page.locator('[data-choose="better"]');
    if (isPhone(info)) await choose.tap();
    else await choose.click();
    await expect(choose).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-choose][aria-pressed="true"]')).toHaveCount(1);
    await page.waitForTimeout(3600);
    await expect(page.locator(figure)).toHaveAttribute('data-scenario', 'better');
  });

  test('the scenarios do not change while motion is paused', async ({ page }) => {
    await openDeck(page, { slide: 8, motion: false });
    await page.waitForTimeout(5200);
    await expect(page.locator(figure)).toHaveAttribute('data-scenario', 'base');
  });

  test('the arrow keys leave the slide even when a scenario button has focus', async ({ page }, info) => {
    test.skip(isPhone(info), 'A phone has no keyboard.');
    await openDeck(page, { slide: 8 });
    await page.locator('[data-choose="worse"]').focus();
    await page.keyboard.press('ArrowRight');
    await expectSlide(page, 9);
  });
});

test.describe('languages', () => {
  test('the switch on the first slide opens the other language', async ({ page }, info) => {
    await openDeck(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const czech = page.getByRole('link', { name: 'CS · Česky' });
    await expect(page.getByRole('link', { name: 'EN · English' })).toHaveAttribute('aria-current', 'true');

    if (isPhone(info)) await czech.tap();
    else await czech.click();
    await expect(page).toHaveURL(/\/cs\/(#1)?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
    await expect(active(page).locator('.t-title')).toHaveText('Jezdi fajně. Žij Ostravou.');
    await expect(page.locator('[data-action="next"]')).toHaveAccessibleName('Další snímek');
  });

  test('each page names its other language versions', async ({ page }) => {
    for (const locale of ['en', 'cs'] as const) {
      await page.goto(home(locale));
      const links = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((nodes) =>
        nodes.map((node) => `${node.getAttribute('hreflang')} ${node.getAttribute('href')}`),
      );
      expect(links).toEqual([
        'en https://fajnovka.zezulka.me/',
        'cs https://fajnovka.zezulka.me/cs/',
        'x-default https://fajnovka.zezulka.me/',
      ]);
    }
  });

  test('the language switch is on the first slide only', async ({ page }) => {
    await openDeck(page, { slide: 2 });
    await expect(page.getByRole('link', { name: 'CS · Česky' })).toBeHidden();
  });
});
