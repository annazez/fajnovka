/**
 * Measures each page with Lighthouse, as a phone and as a desktop computer, and fails if a score is below its limit.
 * The script builds the site first. The pages do not ask for live data in this build, as on a host without the function.
 *
 * Use: `npm run test:lighthouse`
 */
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { build, preview } from 'astro';
import { launch } from 'chrome-launcher';
import lighthouse, { desktopConfig, type Config, type Result } from 'lighthouse';

import { localePath, locales } from '../src/i18n/locales.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = 4398;
const ORIGIN = `http://127.0.0.1:${PORT}`;

/** Each category must have the full score. */
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo', 'agentic-browsing'] as const;
const LIMIT = 1;
/**
 * One limit is lower. The manual is one long page, and the layout of a long page takes time on the slow processor
 * of the phone test. The speed of the manual on a phone must be in the best range of Lighthouse.
 */
const LONG_PAGE = '/manual/';
const LONG_PAGE_SPEED_LIMIT = 0.9;
/** A lab number changes a little from run to run. The middle one of three runs is the result. */
const RUNS = 3;
/**
 * The pages tell search engines not to list them (see README, "Deploy"). That is a decision of the project,
 * so the audit that asks for the opposite does not count.
 */
const SKIPPED_AUDITS = ['is-crawlable'];

const pages = locales.flatMap((locale) => [localePath(locale, '/'), localePath(locale, '/manual/')]);
const devices: readonly (readonly [name: string, config: Config | undefined])[] = [
  ['phone', undefined],
  ['desktop', desktopConfig],
];

const middle = (values: readonly number[]): number =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

const limitOf = (path: string, device: string, category: string): number =>
  category === 'performance' && device === 'phone' && path.endsWith(LONG_PAGE) ? LONG_PAGE_SPEED_LIMIT : LIMIT;

/** The audits of a category that do not have the full score, with their numbers. */
function weakAudits({ categories, audits }: Result, category: string): string[] {
  return (categories[category]?.auditRefs ?? [])
    .map(({ id }) => audits[id])
    .filter((audit) => audit?.score !== null && audit?.score !== undefined && audit.score < 1)
    .map((audit) => `${audit?.id ?? ''}${audit?.displayValue ? ` (${audit.displayValue})` : ''}`);
}

await build({ root, logLevel: 'warn' });
const server = await preview({ root, logLevel: 'warn', server: { host: '127.0.0.1', port: PORT } });
// Lighthouse uses the same Chromium as the browser tests. It opens only the pages of this project.
const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox'] });
const failures: string[] = [];

try {
  for (const path of pages) {
    for (const [device, config] of devices) {
      const results: Result[] = [];
      for (let run = 0; run < RUNS; run += 1) {
        const outcome = await lighthouse(
          `${ORIGIN}${path}`,
          { port: chrome.port, logLevel: 'error', onlyCategories: [...CATEGORIES], skipAudits: SKIPPED_AUDITS },
          config,
        );
        if (!outcome) throw new Error(`Lighthouse gave no result for ${path}.`);
        results.push(outcome.lhr);
      }

      const scores = CATEGORIES.map((category) => {
        const score = middle(results.map(({ categories }) => categories[category]?.score ?? 0));
        if (score < limitOf(path, device, category)) {
          const weak = [...new Set(results.flatMap((result) => weakAudits(result, category)))];
          failures.push(`${path} (${device}) ${category}: ${Math.round(score * 100)}. Audits: ${weak.join(', ')}`);
        }
        return `${category} ${Math.round(score * 100)}`;
      });
      console.log(`${path.padEnd(14)} ${device.padEnd(8)} ${scores.join('  ')}`);
    }
  }
} finally {
  chrome.kill();
  await server.stop();
}

for (const failure of failures) console.error(`Below the limit: ${failure}`);
process.exitCode = failures.length === 0 ? 0 : 1;
