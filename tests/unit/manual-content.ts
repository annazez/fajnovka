/** Reads the chapters of the manual from the disk, for the unit tests. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { locales, type Locale } from '../../src/i18n/locales.ts';

const ROOT = join(process.cwd(), 'src/content/manual');

export interface Chapter {
  /** File name without the extension, for example `02-problem`. */
  name: string;
  title: string;
  order: number;
  /** The Markdown text after the front matter. */
  body: string;
}

function read(locale: Locale, file: string): Chapter {
  const source = readFileSync(join(ROOT, locale, file), 'utf8');
  const match = /^---\ntitle: (.+)\norder: (\d+)\n---\n\n([\s\S]+)$/.exec(source);
  if (!match) throw new Error(`${locale}/${file}: the front matter must be "title" and then "order".`);
  const [, title = '', order = '', body = ''] = match;
  return { name: file.replace(/\.md$/, ''), title, order: Number(order), body };
}

export const chapters: Record<Locale, Chapter[]> = Object.fromEntries(
  locales.map((locale) => [
    locale,
    readdirSync(join(ROOT, locale))
      .filter((file) => file.endsWith('.md'))
      .sort()
      .map((file) => read(locale, file)),
  ]),
) as Record<Locale, Chapter[]>;

/** Addresses of the links in a Markdown text, sorted. */
export function links(body: string): string[] {
  return [...body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1] ?? '').sort();
}

/** Names of the charts in a Markdown text, in the order of the text. */
export function figures(body: string): string[] {
  return [...body.matchAll(/\]\(figure:([\w-]+)\)/g)].map((match) => match[1] ?? '');
}

/**
 * The shape of a chapter: one word for each block (heading, paragraph, list with its length, table with its size, chart).
 * Two languages have the same content when their shapes are equal.
 */
export function shape(body: string): string[] {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.trim().split('\n');
      const [first = ''] = lines;
      if (first.startsWith('#')) return `h${first.length - first.replace(/^#+/, '').length}`;
      if (first.startsWith('|')) return `table ${first.split('|').length - 2}x${lines.length - 2}`;
      if (first.startsWith('![')) return `chart ${figures(first).join()}`;
      if (/^(\d+\.|-) /.test(first)) return `list ${lines.filter((line) => /^\s*(\d+\.|-) /.test(line)).length}`;
      return 'p';
    });
}
