/** The text of a reading of the DPO network, in the language of the page. */
import { languageTag, type Locale } from '../i18n/locales.ts';
import { format, formatNumber, insert } from './format.ts';
import { shareOf, type Occupancy } from './occupancy.ts';

export interface ReadoutTexts {
  /** Text for a reading of this minute. It has `%vehicles` and `%share`. */
  live: string;
  /** Text for the stored snapshot. It also has `%when`. */
  snapshot: string;
}

/** DPO runs in this time zone, so a reading shows this time for each visitor. */
const TIME_ZONE = 'Europe/Prague';

export function describeOccupancy(reading: Occupancy, locale: Locale, texts: ReadoutTexts): string {
  const values = {
    vehicles: formatNumber(reading.vehicles, locale),
    share: format(Math.round(shareOf(reading) * 100), 'percent', locale),
  };
  if (reading.live) return insert(texts.live, values);
  const when = new Intl.DateTimeFormat(languageTag[locale], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(reading.time));
  return insert(texts.snapshot, { ...values, when });
}
