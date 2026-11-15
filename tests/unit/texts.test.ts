import { describe, expect, test } from 'vitest';

import { dictionaries } from '../../src/i18n/index.ts';

/** Each text of a dictionary, with its place in the dictionary. */
function texts(node: unknown, place: string): [place: string, text: string][] {
  if (typeof node === 'string') return [[place, node]];
  if (Array.isArray(node)) return node.flatMap((item: unknown, index) => texts(item, `${place}[${index}]`));
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node).flatMap(([key, value]) => texts(value, `${place}.${key}`));
  }
  return [];
}

/** The year of a study is a part of its name, not a number of the deck. */
const STUDY = /\.evidence\.items\.\w+\.source$/;

describe('texts of the deck', () => {
  for (const [locale, dictionary] of Object.entries(dictionaries)) {
    test(`a text has no number of its own: each number comes from numbers.ts (${locale})`, () => {
      const all = texts(dictionary, locale);
      expect(all.length).toBeGreaterThan(100);

      const withNumber = all
        .filter(([place]) => !STUDY.test(place))
        .filter(([, text]) => /\d/.test(text.replace(/\{[^}]*\}/g, '')))
        .map(([place]) => place);
      expect(withNumber).toEqual([]);
    });
  }
});
