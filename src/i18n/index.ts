/**
 * Dictionaries. `useDictionary(locale)` gives the texts of one language with numbers inserted and typography applied.
 */
import { fill } from '../lib/format.ts';
import { typeset } from '../lib/typeset.ts';
import { cs } from './cs.ts';
import { en } from './en.ts';
import type { Locale } from './locales.ts';

/** The shape of `en.ts` with every text widened to `string`. Tuples keep their length. */
type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<typeof en>;

export const dictionaries: Record<Locale, Dictionary> = { en, cs };

function resolve<T>(node: T, locale: Locale): T;
function resolve(node: unknown, locale: Locale): unknown {
  if (typeof node === 'string') return typeset(fill(node, locale), locale);
  if (Array.isArray(node)) return node.map((item: unknown) => resolve(item, locale));
  if (typeof node === 'object' && node !== null) {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, resolve(value, locale)]));
  }
  return node;
}

export function useDictionary(locale: Locale): Dictionary {
  return resolve(dictionaries[locale], locale);
}
