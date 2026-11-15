import { expect, test, type Page } from '@playwright/test';

import { LIVE_DATA, USUAL_READING, openDeck, watchPage } from './support.ts';

const BUSY = { ...USUAL_READING, vehicles: 1150, passengers: 4700 };
const QUIET = { ...USUAL_READING, vehicles: 31, passengers: 600 };

/** The scene of the layout that the screen shows. */
const scene = (page: Page) => page.locator('#title [data-scene].is-built');

/** Passengers who wait at a stop at some moment of the loop: the places that become visible. */
const waiting = (page: Page) =>
  scene(page).evaluate((root) => {
    const shows = (seat: Element): boolean =>
      seat
        .getAnimations()
        .some((animation) =>
          (animation.effect as KeyframeEffect).getKeyframes().some((frame) => frame.opacity === '1'),
        );
    return [...root.querySelectorAll('.scene__wait i')].filter(shows).length;
  });

test.describe('live data of DPO on the first slide', () => {
  test('the page asks its own server function one time and nothing else', async ({ page }) => {
    const { problems } = watchPage(page);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/'))
        requests.push(`${request.method()} ${new URL(request.url()).pathname}${new URL(request.url()).search}`);
    });
    await openDeck(page);
    await expect.poll(() => requests).toEqual(['GET /api/occupancy']);

    // The slide does not ask again when it enters again.
    await page.keyboard.press('2');
    await page.keyboard.press('1');
    await expect(page.locator('#title.is-active')).toBeVisible();
    expect(requests).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  test('the slide shows no numbers: only the trams tell the reading', async ({ page }) => {
    await openDeck(page, { reading: BUSY });
    await expect(scene(page)).toHaveAttribute('data-demand', '1.60');
    await page.keyboard.press('l');
    await expect(page.locator('#title')).not.toContainText(/\d/);
  });

  test('without an answer the scene is as busy as the stored snapshot', async ({ page }) => {
    await openDeck(page, { reading: null });
    await expect(scene(page)).toHaveAttribute('data-demand', '1.00');
  });

  test('an answer with a wrong shape is not used', async ({ page }) => {
    await page.route(LIVE_DATA, (route) => route.fulfill({ json: { ...BUSY, places: '<b>many</b>' } }));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.deck.is-live')).toBeVisible();
    await expect(scene(page)).toHaveAttribute('data-demand', '1.00');
  });

  test('a fuller network gives a busier scene', async ({ page }) => {
    await openDeck(page, { reading: QUIET });
    await expect(scene(page)).toHaveAttribute('data-demand', '0.40');
    const quiet = await waiting(page);
    expect(quiet).toBeGreaterThan(0);

    await page.unroute(LIVE_DATA);
    await openDeck(page, { reading: BUSY });
    await expect(scene(page)).toHaveAttribute('data-demand', '1.60');
    expect(await waiting(page)).toBeGreaterThan(quiet);
  });

  test('the trams do not start again when the reading comes', async ({ page }) => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(LIVE_DATA, async (route) => {
      await held;
      await route.fulfill({ json: BUSY });
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(scene(page)).toHaveAttribute('data-demand', '1.00');

    // All animations of the scene share one start time: the start of the loop.
    const starts = () =>
      scene(page).evaluate((root) => [
        ...new Set(root.getAnimations({ subtree: true }).map((animation) => animation.startTime)),
      ]);
    const before = await starts();
    expect(before).toHaveLength(1);

    release();
    await expect(scene(page)).toHaveAttribute('data-demand', '1.60');
    expect(await starts()).toEqual(before);
  });
});
