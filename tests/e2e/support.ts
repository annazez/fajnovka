/** Shared helpers of the end-to-end tests. */
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export const SLIDES = [
  'title',
  'paradox',
  'leak',
  'product',
  'journey',
  'evidence',
  'spread',
  'economics',
  'ask',
] as const;
export const LOCALES = ['en', 'cs'] as const;
export type Locale = (typeof LOCALES)[number];

export const home = (locale: Locale): string => (locale === 'en' ? '/' : `/${locale}/`);

/** True for the projects that emulate a phone: they use the flow layout. */
export const isPhone = (info: TestInfo): boolean => info.project.name.startsWith('phone');

/** The answer of the server function with the live data of DPO. The default has the numbers of the stored snapshot. */
export const USUAL_READING = {
  live: true,
  time: '2026-11-15T13:07:00.000Z',
  vehicles: 224,
  counted: 204,
  passengers: 2908,
  places: 24_758,
};
export const LIVE_DATA = '**/api/occupancy';

interface OpenOptions {
  locale?: Locale;
  slide?: number;
  /** Motion on: animations run. Off (the default) gives a still, repeatable page. */
  motion?: boolean;
  /** What the server function answers. `null` means that the function fails. */
  reading?: typeof USUAL_READING | null;
}

/** Opens the deck and waits until the script has taken control. The tests run without a network: the page gets its live data here. */
export async function openDeck(
  page: Page,
  { locale = 'en', slide = 1, motion = false, reading = USUAL_READING }: OpenOptions = {},
): Promise<void> {
  await page.route(LIVE_DATA, (route) =>
    reading ? route.fulfill({ json: reading }) : route.fulfill({ status: 503, body: 'no data' }),
  );
  await page.emulateMedia({ reducedMotion: motion ? 'no-preference' : 'reduce' });
  await page.goto(`${home(locale)}${slide === 1 ? '' : `#${slide}`}`);
  await expect(page.locator('.deck.is-live')).toBeVisible();
  await expect(active(page)).toHaveAttribute('id', SLIDES[slide - 1] ?? '');
}

export const active = (page: Page): Locator => page.locator('.slide.is-active');
export const deck = (page: Page): Locator => page.locator('[data-deck]');

export async function expectSlide(page: Page, number: number): Promise<void> {
  await expect(active(page)).toHaveAttribute('id', SLIDES[number - 1] ?? '');
  await expect(page).toHaveURL(new RegExp(`#${number}$`));
}

/** Collects everything that must not happen on a healthy page. */
export function watchPage(page: Page): { problems: string[] } {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`error: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));
  page.on('request', (request) => {
    const { hostname } = new URL(request.url());
    if (hostname !== '127.0.0.1') problems.push(`third party: ${request.url()}`);
  });
  return { problems };
}
