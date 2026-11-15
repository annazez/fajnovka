import { describe, expect, test } from 'vitest';

import { numbers } from '../../src/data/numbers.ts';
import { locales, type Locale } from '../../src/i18n/locales.ts';
import { figureIds } from '../../src/lib/figures.ts';
import { format, formatNumber, type Format } from '../../src/lib/format.ts';
import { chapters, figures, links, shape } from './manual-content.ts';

const text = (locale: Locale): string => chapters[locale].map(({ body }) => body).join('\n');

describe('chapters of the manual', () => {
  test.each(locales)('%s: the order in the front matter follows the file names', (locale) => {
    const list = chapters[locale];
    expect(list.length).toBeGreaterThan(0);
    list.forEach((chapter, index) => {
      expect(chapter.order, chapter.name).toBe(index + 1);
      expect(chapter.name, chapter.name).toMatch(new RegExp(`^${String(index + 1).padStart(2, '0')}-[a-z-]+$`));
      expect(chapter.title.trim(), chapter.name).not.toBe('');
    });
  });

  test('each language has the same chapters', () => {
    const [first, ...rest] = locales.map((locale) => chapters[locale].map(({ name }) => name));
    for (const names of rest) expect(names).toEqual(first);
  });

  test('each chapter has the same blocks in each language', () => {
    for (const [index, english] of chapters.en.entries()) {
      expect(shape(chapters.cs[index]?.body ?? ''), english.name).toEqual(shape(english.body));
    }
  });

  test('each chapter has the same links in each language', () => {
    for (const [index, english] of chapters.en.entries()) {
      expect(links(chapters.cs[index]?.body ?? ''), english.name).toEqual(links(english.body));
    }
  });

  test.each(locales)('%s: the last chapter lists each link of the other chapters', (locale) => {
    const sources = new Set(links(chapters[locale].at(-1)?.body ?? ''));
    const missing = chapters[locale].slice(0, -1).flatMap(({ name, body }) => links(body).filter((link) => !sources.has(link)).map((link) => `${name}: ${link}`));
    expect(missing).toEqual([]);
  });

  test.each(locales)('%s: each chart is in the manual one time', (locale) => {
    expect(figures(text(locale)).sort()).toEqual([...figureIds].sort());
  });

  test.each(locales)('%s: the text has no characters that the writer must not type', (locale) => {
    const source = text(locale);
    // The typeset function adds non-breaking spaces. The font has no arrows, subscripts or comparison signs.
    expect(source).not.toMatch(/[  →←↔≥≤₂]/);
    expect(source).not.toContain('embedded content');
    expect(source).not.toMatch(/^- \[[ x]\]/m);
  });
});

describe('numbers of the deck in the manual', () => {
  const shared: readonly (readonly [keyof typeof numbers, Format])[] = [
    ['residentsNearStop', 'number'],
    ['peakOccupancy', 'percent'],
    ['nonRenewals', 'number'],
    ['passengersFirstYear', 'number'],
    ['passengersLastYear', 'number'],
    ['programmeCost', 'mczk'],
    ['compensationShare', 'percent'],
    ['costReturn', 'czk'],
    ['costKeep', 'czk'],
    ['costAcquire', 'czk'],
    ['paybackBase', 'year'],
    ['paybackBetter', 'year'],
    ['pilotCost', 'mczk'],
  ];

  test.each(locales)('%s: the manual gives each number with the same value as the deck', (locale) => {
    const source = text(locale).replaceAll(' ', ' ');
    const missing = shared
      .map(([key, kind]) => [key, format(numbers[key].value, kind, locale).replaceAll(' ', ' ')] as const)
      .filter(([, shown]) => !source.includes(shown))
      .map(([key, shown]) => `${key}: ${shown}`);
    expect(missing).toEqual([]);
  });

  test('the number formats are those that the test expects', () => {
    expect(formatNumber(258_764, 'en')).toBe('258,764');
    expect(formatNumber(258_764, 'cs').replaceAll(' ', ' ')).toBe('258 764');
  });
});
