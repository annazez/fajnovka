/** The chapters of the manual in one language, in their order. Only code that Astro runs can import this file. */
import { getCollection, type CollectionEntry } from 'astro:content';

import type { Locale } from '../i18n/locales.ts';

export interface Chapter {
  /** Anchor of the chapter on the manual page, the same in each language: `en/02-problem` gives `problem`. */
  slug: string;
  number: number;
  title: string;
  /** The Markdown text of the chapter. */
  body: string;
  entry: CollectionEntry<'manual'>;
}

export async function loadChapters(locale: Locale): Promise<Chapter[]> {
  const entries = await getCollection('manual', ({ id }) => id.startsWith(`${locale}/`));
  return entries
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => ({
      slug: entry.id.replace(/^[a-z]+\/\d+-/, ''),
      number: entry.data.order,
      title: entry.data.title,
      body: entry.body ?? '',
      entry,
    }));
}
