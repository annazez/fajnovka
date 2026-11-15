/** Facts about the manual that are the same in each language. */
import type { Locale } from '../i18n/locales.ts';

export const manual = {
  team: 'MSIC LabZero',
  authors: ['Anna Zezulka', 'Richard Albrecht', 'Jakub Dedek'],
  /** Year and month of this edition. */
  published: '2026-11',
} as const;

/** Address of the PDF of the manual in one language. `npm run manual:pdf` makes the file. */
export function manualPdf(locale: Locale): string {
  return `/manual/fajnovka-manual-${locale}.pdf`;
}
