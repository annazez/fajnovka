/** Languages of the site. English is the language of the pitch and has no URL prefix. */
export const locales = ['en', 'cs'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

/** BCP 47 tags for number formats and the `lang` attribute. */
export const languageTag: Record<Locale, string> = { en: 'en-GB', cs: 'cs-CZ' };

export function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

/** Path of a page in a given language, for example `localePath('cs', '/manual/')` gives `/cs/manual/`. */
export function localePath(locale: Locale, path = '/'): string {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

/** Name of each language in that language. */
export const languageName: Record<Locale, string> = { en: 'English', cs: 'Česky' };

/** The locale of a page from `Astro.currentLocale`. */
export function toLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}
