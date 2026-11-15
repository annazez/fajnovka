import { describe, expect, test } from 'vitest';

import { scenarios, tenYears } from '../../src/data/model.ts';
import { numbers } from '../../src/data/numbers.ts';
import { locales } from '../../src/i18n/locales.ts';
import { cumulativeBenefit, drawFigure, figureIds, isFigureId, paybackYear, regionBenefit, signed } from '../../src/lib/figures.ts';

const cases = locales.flatMap((locale) => figureIds.map((id) => [locale, id] as const));

describe('charts of the manual', () => {
  test.each(cases)('%s: the chart "%s" is one SVG picture with a description', (locale, id) => {
    const { svg } = drawFigure(id, locale);
    expect(svg).toMatch(/^<svg class="chart" viewBox="0 0 680 \d+" font-size="12" role="img" aria-label="[^"]{20,}">/);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  test.each(cases)('%s: each number in the chart "%s" stays inside the picture', (locale, id) => {
    const { svg } = drawFigure(id, locale);
    const height = Number(/viewBox="0 0 680 (\d+)"/.exec(svg)?.[1]);
    const positions = [...svg.matchAll(/<(?:text|circle)[^>]* (?:x|cx)="(-?[\d.]+)" (?:y|cy)="(-?[\d.]+)"/g)];
    expect(positions.length).toBeGreaterThan(0);
    for (const [, x, y] of positions) {
      expect(Number(x)).toBeGreaterThanOrEqual(0);
      expect(Number(x)).toBeLessThanOrEqual(680);
      expect(Number(y)).toBeGreaterThanOrEqual(0);
      expect(Number(y)).toBeLessThanOrEqual(height);
    }
  });

  test.each(locales)('%s: a chart over time has a table of its values', (locale) => {
    for (const id of ['passengers', 'revenue', 'passengers-extra', 'payback'] as const) {
      const { table } = drawFigure(id, locale);
      expect(table?.rows.length, id).toBeGreaterThanOrEqual(10);
      for (const row of table?.rows ?? []) expect(row.length, id).toBe(table?.head.length);
    }
  });

  test('the passenger chart shows the first and the last number of the deck', () => {
    const { svg } = drawFigure('passengers', 'en');
    expect(svg).toContain(`>${numbers.passengersFirstYear.value}</text>`);
    expect(svg).toContain(`>${numbers.passengersLastYear.value}</text>`);
  });

  test('the cost chart shows the costs of the deck', () => {
    const { svg } = drawFigure('levers', 'en');
    for (const key of ['costReturn', 'costKeep', 'costAcquire'] as const) {
      expect(svg).toContain(numbers[key].value.toLocaleString('en-GB'));
    }
  });

  test('isFigureId knows the names of the charts', () => {
    expect(isFigureId('payback')).toBe(true);
    expect(isFigureId('pie')).toBe(false);
  });
});

describe('ten-year model', () => {
  test('each scenario has the ten years from 2027', () => {
    for (const scenario of scenarios) {
      expect(tenYears[scenario].map(({ year }) => year)).toEqual([2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036]);
    }
  });

  test('the years of payback are the years that the deck shows', () => {
    expect(paybackYear('base')).toBe(numbers.paybackBase.value);
    expect(paybackYear('better')).toBe(numbers.paybackBetter.value);
    expect(paybackYear('worse')).toBeUndefined();
  });

  test('the sums of ten years are the sums in the text of the manual', () => {
    const rounded = (scenario: (typeof scenarios)[number]) => Object.fromEntries(Object.entries(regionBenefit(scenario)).map(([key, value]) => [key, Math.round(value)]));
    expect(rounded('worse')).toEqual({ city: -70, kodis: 21, partners: 34, cars: 72, total: 56 });
    expect(rounded('base')).toEqual({ city: 18, kodis: 42, partners: 34, cars: 162, total: 256 });
    expect(rounded('better')).toEqual({ city: 102, kodis: 74, partners: 34, cars: 257, total: 468 });
  });

  test('the cumulative benefit ends at the net benefit of ten years', () => {
    expect(cumulativeBenefit(tenYears.base).at(-1)).toBeCloseTo(regionBenefit('base').city, 6);
  });

  test('a signed number has a plus or a true minus sign', () => {
    expect(signed(18, 'en')).toBe('+18');
    expect(signed(-70, 'en')).toBe('\u221270');
    expect(signed(1234.5, 'cs')).toBe('+1\u00a0234,5');
  });
});
