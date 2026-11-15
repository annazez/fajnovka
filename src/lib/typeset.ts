/**
 * Typography rules that a writer must not do by hand.
 * All languages: a name stays with the year that follows it ("Bamberg 2006").
 * Czech: a one-letter preposition or conjunction stays with the next word, and a number stays with its unit.
 */
import type { Locale } from '../i18n/locales.ts';

const NBSP = '\u00a0';
const NAME_AND_YEAR = /(\p{L}) (?=\d{4}(?!\d))/gu;
const ONE_LETTER_WORD = /(^|[\s(„])([ksvzouai]) /giu;
const NUMBER_AND_UNIT = /(\d) (?=\p{L})/gu;

export function typeset(text: string, locale: Locale): string {
  const cited = text.replace(NAME_AND_YEAR, `$1${NBSP}`);
  if (locale !== 'cs') return cited;
  return cited.replace(ONE_LETTER_WORD, `$1$2${NBSP}`).replace(NUMBER_AND_UNIT, `$1${NBSP}`);
}
