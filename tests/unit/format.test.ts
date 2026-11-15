import { describe, expect, test } from 'vitest';

import { numbers } from '../../src/data/numbers.ts';
import { fill, format, formatNumber, insert, percentSign } from '../../src/lib/format.ts';

describe('number formats', () => {
  test('each language groups digits in its own way', () => {
    expect(formatNumber(258_764, 'en')).toBe('258,764');
    expect(formatNumber(258_764, 'cs')).toBe('258\u00a0764');
    expect(formatNumber(0.555, 'en')).toBe('0.56');
    expect(formatNumber(0.55, 'cs')).toBe('0,55');
  });

  test('a unit stays with its number: a non-breaking space joins them', () => {
    expect(format(12, 'percent', 'en')).toBe('12%');
    expect(format(12, 'percent', 'cs')).toBe('12\u00a0%');
    expect(percentSign('en')).toBe('%');
    expect(format(2220, 'czk', 'en')).toBe('CZK\u00a02,220');
    expect(format(2220, 'czk', 'cs')).toBe('2\u00a0220\u00a0Kč');
    expect(format(11.6, 'mczk', 'en')).toBe('CZK\u00a011.6\u00a0million');
    expect(format(11.6, 'mczk', 'cs')).toBe('11,6\u00a0mil.\u00a0Kč');
    expect(format(2034, 'year', 'cs')).toBe('2034');
    expect(format(2034, 'number', 'en')).toBe('2,034');
  });
});

describe('numbers in a text', () => {
  test('a placeholder becomes the number of that name, in the format that it asks for', () => {
    expect(fill('{walkMinutes} minutes', 'en')).toBe(`${numbers.walkMinutes.value} minutes`);
    expect(fill('{peakOccupancy:percent} of places', 'en')).toBe(`${numbers.peakOccupancy.value}% of places`);
    expect(fill('no numbers here', 'cs')).toBe('no numbers here');
  });

  test('an unknown number or format stops the build and names the text', () => {
    expect(() => fill('{nobody} minutes', 'en')).toThrow('Unknown number "nobody" in text: {nobody} minutes');
    expect(() => fill('{walkMinutes:words}', 'en')).toThrow('Unknown format "words" in text: {walkMinutes:words}');
  });

  test('a named value goes into its place in a text', () => {
    expect(insert('Figure: %title. %title again, by %author.', { title: 'Costs', author: 'the team' })).toBe(
      'Figure: Costs. Costs again, by the team.',
    );
    expect(insert('100 % sure', {})).toBe('100 % sure');
  });

  test('a place without a value stops the build', () => {
    expect(() => insert('Figure: %title', {})).toThrow('No value for "%title" in text: Figure: %title');
  });
});
