/**
 * Number formats for both languages, and the `{key:format}` placeholders of the dictionaries.
 * Pure functions: the pages and the browser script share them.
 */
import { numbers, type NumberKey } from '../data/numbers.ts';
import { languageTag, type Locale } from '../i18n/locales.ts';

const NBSP = ' ';

export type Format = 'number' | 'percent' | 'czk' | 'mczk' | 'year';

/** Plain number in the locale's style: `258,764` in English, `258 764` in Czech. */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(languageTag[locale], { maximumFractionDigits: 2 }).format(value);
}

/** The percent sign follows the number directly in English and after a space in Czech. */
export function percentSign(locale: Locale): string {
  return locale === 'cs' ? `${NBSP}%` : '%';
}

export function format(value: number, kind: Format, locale: Locale): string {
  const plain = formatNumber(value, locale);
  switch (kind) {
    case 'number':
      return plain;
    case 'percent':
      return plain + percentSign(locale);
    case 'czk':
      return locale === 'cs' ? `${plain}${NBSP}Kč` : `CZK${NBSP}${plain}`;
    case 'mczk':
      return locale === 'cs' ? `${plain}${NBSP}mil.${NBSP}Kč` : `CZK${NBSP}${plain}${NBSP}million`;
    case 'year':
      return String(value);
  }
}

const PLACEHOLDER = /\{(\w+)(?::(\w+))?\}/g;
const formats: readonly string[] = ['number', 'percent', 'czk', 'mczk', 'year'];

function isNumberKey(key: string): key is NumberKey {
  return Object.hasOwn(numbers, key);
}

function isFormat(name: string): name is Format {
  return formats.includes(name);
}

/** Replaces each `{key}` or `{key:format}` in a dictionary text with the formatted number. */
export function fill(text: string, locale: Locale): string {
  return text.replace(PLACEHOLDER, (_, key: string, kind = 'number') => {
    if (!isNumberKey(key)) throw new Error(`Unknown number "${key}" in text: ${text}`);
    if (!isFormat(kind)) throw new Error(`Unknown format "${kind}" in text: ${text}`);
    return format(numbers[key].value, kind, locale);
  });
}

/** Replaces each `%name` in a text with the value of that name. */
export function insert(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(/%(\w+)/g, (token, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`No value for "${token}" in text: ${text}`);
    return value;
  });
}
