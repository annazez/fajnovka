import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { manualMd, manualPdf } from '../../src/data/manual.ts';
import { snapshot } from '../../src/data/occupancy.ts';
import { REPOSITORY, SITE } from '../../src/data/site.ts';
import { locales, type Locale } from '../../src/i18n/locales.ts';
import {
  absolute,
  aiCatalog,
  ardManifest,
  catalogEntries,
  deckJsonLd,
  llmsText,
  manualJsonLd,
  manualText,
  openApi,
  type ChapterText,
} from '../../src/lib/agents.ts';
import { figureIds } from '../../src/lib/figures.ts';
import { isOccupancy } from '../../src/lib/occupancy.ts';
import { chapters, figures } from './manual-content.ts';

/** The chapters in the form that the pages give to the agent layer. */
const chapterTexts = (locale: Locale): ChapterText[] =>
  chapters[locale].map(({ name, title, order, body }) => ({ slug: name.replace(/^\d+-/, ''), number: order, title, body }));

/** Paths of the site that exist after a build: pages, generated files, and files in `public`. */
const BUILT = ['/', '/cs/', '/manual/', '/cs/manual/', '/manual.md', '/cs/manual.md', '/llms.txt', '/openapi.json', '/api/occupancy'];
const exists = (address: string): boolean => {
  const { origin, pathname } = new URL(address);
  if (origin !== SITE) return address === REPOSITORY;
  return BUILT.includes(pathname) || existsSync(join(process.cwd(), 'public', pathname));
};

describe('llms.txt', () => {
  const text = llmsText(chapterTexts('en'));
  const lines = text.split('\n');
  const linkLines = lines.filter((line) => line.startsWith('- '));

  test('it has the form of llmstxt.org: one title, a summary in a quote, then sections of links', () => {
    expect(lines[0]).toBe('# Fajnovka');
    expect(lines.filter((line) => line.startsWith('# '))).toHaveLength(1);
    expect(lines[2]).toMatch(/^> \S/);
    expect(lines.filter((line) => line.startsWith('## '))).toEqual(['## Manual', '## Pitch deck', '## Data', '## Optional']);
    expect(lines.filter((line) => /^#{3,}/.test(line))).toEqual([]);
    expect(text.endsWith('\n')).toBe(true);
  });

  test('each item of a list is one link with a full address that exists', () => {
    expect(linkLines.length).toBeGreaterThan(20);
    for (const line of linkLines) {
      const match = /^- \[([^\]]+)\]\((https:\/\/[^)\s]+)\)(: \S.*)?$/.exec(line);
      expect(match, line).not.toBeNull();
      expect(exists(match?.[2] ?? ''), line).toBe(true);
    }
  });

  test('it lists each chapter of the manual with its anchor', () => {
    for (const { slug, number, title } of chapterTexts('en')) {
      expect(text).toContain(`- [Chapter ${number}: ${title}](${SITE}/manual/#${slug})`);
    }
  });

  test('it says that the proposal is not an official product', () => {
    expect(lines[2]).toContain('not an official product');
  });

  test('it has ordinary spaces only', () => {
    expect(text).not.toContain(' ');
  });
});

describe.each(locales)('the manual as Markdown (%s)', (locale) => {
  const text = manualText(locale, chapterTexts(locale));

  test('it starts with one title and holds each chapter under its number', () => {
    expect(text.split('\n')[0]).toMatch(/^# Fajnovka: \S/);
    expect(text.match(/^# /gm)).toHaveLength(1);
    expect(text.match(/^## .+$/gm)).toEqual(chapters[locale].map(({ order, title }) => `## ${order} ${title}`));
  });

  test('each chart is its caption, and a table of values where the chart has one', () => {
    expect(text).not.toContain('figure:');
    const all = chapters[locale].flatMap(({ body }) => figures(body));
    expect(all.toSorted()).toEqual([...figureIds].toSorted());
    for (const { body } of chapters[locale]) {
      for (const [, caption = ''] of body.matchAll(/^!\[(.*)\]\(figure:[\w-]+\)$/gm)) expect(text).toContain(`*${caption}*`);
    }
    // The chart of passengers has a table of years: its first year is in the text as a row.
    expect(text).toMatch(/^\| 2010 \| .+ \|$/m);
  });

  test('each block of each chapter is in the text, word for word', () => {
    for (const { name, body } of chapters[locale]) {
      const blocks = body.trim().split(/\n\s*\n/).filter((block) => !block.includes('](figure:'));
      expect(blocks.length, name).toBeGreaterThan(0);
      for (const block of blocks) expect(text.includes(block), `${name}: ${block.slice(0, 60)}`).toBe(true);
    }
  });

  test('its address is under the language of the page', () => {
    expect(manualMd(locale)).toBe(locale === 'en' ? '/manual.md' : `/${locale}/manual.md`);
  });
});

describe('catalogue of resources (ARD)', () => {
  const entries = catalogEntries();

  test('each entry has a unique name of this site, a title, one address and two to five questions', () => {
    expect(new Set(entries.map(({ identifier }) => identifier)).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.identifier).toMatch(/^urn:air:fajnovka\.zezulka\.me:[a-z]+:[a-z-]+$/);
      expect(entry.displayName.trim()).not.toBe('');
      expect(entry.description.trim()).not.toBe('');
      expect(exists(entry.url), entry.url).toBe(true);
      expect('data' in entry).toBe(false);
      expect(entry.representativeQueries.length).toBeGreaterThanOrEqual(2);
      expect(entry.representativeQueries.length).toBeLessThanOrEqual(5);
      expect(new Set(entry.representativeQueries).size).toBe(entry.representativeQueries.length);
    }
  });

  test('each type is a media type of a file that a program can read', () => {
    expect(entries.map(({ type, url }) => [type, url.split('.').at(-1)])).toEqual([
      ['application/openapi+json', 'json'],
      ['application/pdf', 'pdf'],
      ['application/pdf', 'pdf'],
    ]);
  });

  test('the manifest holds the entries only; the older form adds the version and the host', () => {
    expect(ardManifest()).toEqual({ entries });
    expect(aiCatalog()).toEqual({ specVersion: '1.0', host: { displayName: 'Fajnovka' }, entries });
  });

  test('the two PDF files of the manual are in the catalogue', () => {
    for (const locale of locales) expect(entries.map(({ url }) => url)).toContain(absolute(manualPdf(locale)));
  });
});

describe('OpenAPI description of the live data', () => {
  const document = openApi() as {
    openapi: string;
    servers: { url: string }[];
    paths: Record<string, { get: { operationId: string; responses: Record<string, { content: Record<string, { schema: { $ref: string } }> }> } }>;
    components: { schemas: { Occupancy: { required: string[]; properties: Record<string, { type: string; description: string }>; additionalProperties: boolean } } };
  };
  const schema = document.components.schemas.Occupancy;

  test('it describes the one server function of the site', () => {
    expect(document.openapi).toBe('3.1.0');
    expect(document.servers).toEqual([{ url: SITE }]);
    expect(Object.keys(document.paths)).toEqual(['/api/occupancy']);
    expect(document.paths['/api/occupancy']?.get.responses['200']?.content['application/json']?.schema.$ref).toBe('#/components/schemas/Occupancy');
  });

  test('the schema has the fields of a reading, each with a description, and no other field', () => {
    expect(Object.keys(schema.properties).toSorted()).toEqual(Object.keys(snapshot).toSorted());
    expect(schema.required.toSorted()).toEqual(Object.keys(snapshot).toSorted());
    expect(schema.additionalProperties).toBe(false);
    // A reading holds a boolean, a time as text, and counts.
    const schemaType: Record<string, string> = { boolean: 'boolean', string: 'string', number: 'integer' };
    for (const [name, property] of Object.entries(schema.properties)) {
      expect(property.description.trim(), name).not.toBe('');
      expect(property.type, name).toBe(schemaType[typeof snapshot[name as keyof typeof snapshot]]);
    }
    expect(isOccupancy(snapshot)).toBe(true);
  });
});

describe('structured data (JSON-LD)', () => {
  type Work = Record<string, unknown> & { url: string; workTranslation?: { '@id': string }[]; translationOfWork?: { '@id': string }[] };
  const pages = { deck: deckJsonLd, manual: manualJsonLd } as const;

  test.each(locales)('%s: the deck is a presentation and the manual is a report, each at its own address', (locale) => {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    expect(deckJsonLd(locale)).toMatchObject({ '@context': 'https://schema.org', '@type': 'PresentationDigitalDocument', url: `${SITE}${prefix}/`, inLanguage: locale });
    expect(manualJsonLd(locale)).toMatchObject({
      '@type': 'Report',
      url: `${SITE}${prefix}/manual/`,
      inLanguage: locale,
      encoding: { '@type': 'MediaObject', contentUrl: absolute(manualPdf(locale)), encodingFormat: 'application/pdf' },
    });
  });

  test.each(Object.entries(pages))('%s: the languages point to each other', (_, make) => {
    const english = make('en') as Work;
    const czech = make('cs') as Work;
    expect(english.workTranslation).toEqual([{ '@id': czech.url }]);
    expect(czech.translationOfWork).toEqual([{ '@id': english.url }]);
    expect(english.translationOfWork).toBeUndefined();
    expect(czech.workTranslation).toBeUndefined();
  });

  test('each page names the three authors and has ordinary spaces only', () => {
    for (const make of Object.values(pages)) {
      for (const locale of locales) {
        const data = make(locale) as Work;
        expect(data.author).toEqual(['Anna Zezulka', 'Richard Albrecht', 'Jakub Dedek'].map((name) => ({ '@type': 'Person', name })));
        expect(JSON.stringify(data)).not.toContain(' ');
      }
    }
  });
});
