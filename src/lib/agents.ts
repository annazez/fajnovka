/**
 * What the site tells AI agents about itself: llms.txt, the manual as plain Markdown, the catalogue of resources (ARD),
 * the OpenAPI description of the one server function, and structured data (JSON-LD).
 * All of it comes from the same texts and data as the pages, so it cannot go out of date.
 */
import { manual, manualMd, manualPdf } from '../data/manual.ts';
import { REPOSITORY, SITE } from '../data/site.ts';
import { useDictionary } from '../i18n/index.ts';
import { defaultLocale, localePath, locales, type Locale } from '../i18n/locales.ts';
import { drawFigure, isFigureId } from './figures.ts';

/** Full address of a path on the site. */
export const absolute = (path: string): string => new URL(path, SITE).href;

/** Text for a machine: ordinary spaces, no typography. */
const plain = (text: string): string => text.replaceAll('\u00a0', ' ');

export interface ChapterText {
  slug: string;
  number: number;
  title: string;
  body: string;
}

const SUMMARY =
  'Fajnovka is a proposal for a loyalty programme for public transport in Ostrava, Czech Republic. A student team made it in the MSIC LabZero programme in 2026. It is not an official product of the City of Ostrava, DPO or KODIS. The numbers of the programme are estimates.';

// llms.txt

/** The guide to the site for language models (https://llmstxt.org): one title, one summary, lists of links. */
export function llmsText(chapters: readonly ChapterText[]): string {
  const link = (name: string, path: string, note = ''): string => `- [${name}](${path.startsWith('http') ? path : absolute(path)})${note && `: ${note}`}`;
  const title = plain(useDictionary('en').manual.title);

  return [
    '# Fajnovka',
    '',
    `> ${SUMMARY}`,
    '',
    'The site has a three-minute pitch deck and the full manual of the proposal. Each of them is in English and in Czech.',
    '',
    '## Manual',
    '',
    link(`${title} as Markdown`, manualMd('en'), 'all chapters in one text file, the best form for a language model'),
    link(`${title} as a page`, '/manual/'),
    link(`${title} as PDF`, manualPdf('en')),
    ...chapters.map(({ slug, number, title }) => link(`Chapter ${number}: ${plain(title)}`, `/manual/#${slug}`)),
    '',
    '## Pitch deck',
    '',
    link('Pitch deck in English', '/', 'nine slides; each slide holds the text that the speaker says'),
    link('Pitch deck in Czech', '/cs/'),
    '',
    '## Data',
    '',
    link('Live occupancy of DPO vehicles', '/api/occupancy', 'JSON; how many vehicles are on the road in Ostrava and how full they are, one reading a minute'),
    link('OpenAPI description of the live data', '/openapi.json'),
    '',
    '## Optional',
    '',
    link(`${title} in Czech as Markdown`, manualMd('cs')),
    link(`${title} in Czech as PDF`, manualPdf('cs')),
    link('Source code', REPOSITORY),
    '',
  ].join('\n');
}

// The manual as Markdown

const FIGURE = /^!\[(.*)\]\(figure:([\w-]+)\)$/;

/** A chart becomes its caption and, where the chart has a table of values, that table. */
function figureText(caption: string, name: string, locale: Locale): string {
  const table = isFigureId(name) ? drawFigure(name, locale).table : undefined;
  const row = (cells: readonly string[]): string => `| ${cells.map(plain).join(' | ')} |`;
  const rows = table ? ['', row(table.head), row(table.head.map(() => '---')), ...table.rows.map(row)] : [];
  return [`*${caption}*`, ...rows].join('\n');
}

/** The full manual of one language as one Markdown text. */
export function manualText(locale: Locale, chapters: readonly ChapterText[]): string {
  const t = useDictionary(locale).manual;
  const head = [`# Fajnovka: ${plain(t.title)}`, '', `> ${plain(t.lead)}`, '', `${manual.authors.join(', ')} · ${manual.team} · ${manual.published}`];
  const parts = chapters.map(({ number, title, body }) => {
    const text = body
      .trim()
      .split('\n')
      .map((line) => {
        const figure = FIGURE.exec(line);
        return figure ? figureText(figure[1] ?? '', figure[2] ?? '', locale) : line;
      })
      .join('\n');
    return `## ${number} ${plain(title)}\n\n${text}`;
  });
  return `${[head.join('\n'), ...parts].join('\n\n')}\n`;
}

// Catalogue of resources (Agentic Resource Discovery)

export interface CatalogEntry {
  /** `urn:air:<publisher>:<namespace>:<name>`; the publisher is the domain of the site. */
  identifier: string;
  displayName: string;
  /** Media type of the resource. */
  type: string;
  url: string;
  description: string;
  /** Two to five questions that this resource answers. Registries use them for search. */
  representativeQueries: string[];
}

const urn = (namespace: string, name: string): string => `urn:air:${new URL(SITE).hostname}:${namespace}:${name}`;

export function catalogEntries(): CatalogEntry[] {
  return [
    {
      identifier: urn('api', 'occupancy'),
      displayName: 'Live occupancy of public transport vehicles in Ostrava',
      type: 'application/openapi+json',
      url: absolute('/openapi.json'),
      description: 'One reading a minute: the vehicles of DPO on the road, their passengers and their places. Source: the public dashboard of DPO.',
      representativeQueries: [
        'How full are the trams and buses in Ostrava now?',
        'How many public transport vehicles are on the road in Ostrava?',
        'What share of the capacity of public transport in Ostrava is in use?',
      ],
    },
    {
      identifier: urn('docs', 'manual-en'),
      displayName: 'Fajnovka: the full manual (English)',
      type: 'application/pdf',
      url: absolute(manualPdf('en')),
      description: `${SUMMARY} The manual gives the customers, the reward system, the evidence, the business model, the pilot and the sources.`,
      representativeQueries: [
        'What is the Fajnovka loyalty programme for public transport in Ostrava?',
        'How much does the Fajnovka programme cost and when does it pay back?',
        'How does the Fajnovka pilot in Poruba measure its effect?',
      ],
    },
    {
      identifier: urn('docs', 'manual-cs'),
      displayName: 'Fajnovka: kompletní manuál (česky)',
      type: 'application/pdf',
      url: absolute(manualPdf('cs')),
      description: 'Návrh věrnostního programu MHD pro Ostravu: zákazníci, systém odměn, důkazy, byznys model, pilot a zdroje. Návrh studentského týmu, ne oficiální produkt města, DPO ani KODIS.',
      representativeQueries: ['Co je věrnostní program Fajnovka pro MHD v Ostravě?', 'Kolik program Fajnovka stojí a kdy se vrátí?', 'Jak pilot Fajnovky v Porubě měří svůj efekt?'],
    },
  ];
}

/** The manifest at /.well-known/ard.json (ARD 0.91). */
export const ardManifest = (): { entries: CatalogEntry[] } => ({ entries: catalogEntries() });

/** The same entries in the older form at /.well-known/ai-catalog.json, which some tools still read. */
export const aiCatalog = (): { specVersion: string; host: { displayName: string }; entries: CatalogEntry[] } => ({
  specVersion: '1.0',
  host: { displayName: 'Fajnovka' },
  entries: catalogEntries(),
});

// OpenAPI description of the server function

const count = (description: string): { type: 'integer'; minimum: 0; description: string } => ({ type: 'integer', minimum: 0, description });

export function openApi(): object {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Fajnovka: live occupancy of DPO vehicles',
      version: '1.0.0',
      description:
        'One reading of the public transport network of Ostrava (DPO). The numbers come from the public dashboard of DPO. Each answer is kept for one minute. If the dashboard does not answer, the reading is a stored snapshot with "live": false.',
    },
    servers: [{ url: SITE }],
    paths: {
      '/api/occupancy': {
        get: {
          operationId: 'getOccupancy',
          summary: 'How full the vehicles of DPO are now',
          responses: {
            '200': {
              description: 'One reading of the network.',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Occupancy' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Occupancy: {
          type: 'object',
          additionalProperties: false,
          required: ['live', 'time', 'vehicles', 'counted', 'passengers', 'places'],
          properties: {
            live: { type: 'boolean', description: 'True for a reading of this minute, false for the stored snapshot.' },
            time: { type: 'string', format: 'date-time', description: 'Time of the reading.' },
            vehicles: count('Vehicles on the road.'),
            counted: count('Vehicles that count their passengers.'),
            passengers: count('Passengers in the vehicles that count them.'),
            places: count('Places to sit and to stand in the vehicles that count their passengers.'),
          },
        },
      },
    },
  };
}

// Structured data (JSON-LD, schema.org)

const authors = (): object[] => manual.authors.map((name) => ({ '@type': 'Person', name }));

/** The other language versions of a page, as schema.org translations. */
function translations(locale: Locale, path: string): object {
  const others = locales.filter((code) => code !== locale).map((code) => ({ '@id': absolute(localePath(code, path)) }));
  return locale === defaultLocale ? { workTranslation: others } : { translationOfWork: others };
}

function work(type: string, locale: Locale, path: string, name: string, description: string): Record<string, unknown> {
  const url = absolute(localePath(locale, path));
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': url,
    url,
    name: plain(name),
    description: plain(description),
    inLanguage: locale,
    datePublished: manual.published,
    author: authors(),
    isAccessibleForFree: true,
    about: { '@type': 'Thing', name: 'Public transport in Ostrava' },
    ...translations(locale, path),
  };
}

export function deckJsonLd(locale: Locale): object {
  const { meta } = useDictionary(locale);
  return work('PresentationDigitalDocument', locale, '/', meta.title, meta.description);
}

export function manualJsonLd(locale: Locale): object {
  const t = useDictionary(locale).manual;
  return {
    ...work('Report', locale, '/manual/', `Fajnovka: ${t.title}`, t.description),
    encoding: { '@type': 'MediaObject', contentUrl: absolute(manualPdf(locale)), encodingFormat: 'application/pdf' },
  };
}
