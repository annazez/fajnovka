/**
 * The rules for the Markdown of the manual, as one plugin for the Markdown processor (Sätteri).
 *
 * 1. Typography: the text gets the same `typeset` rules as the deck.
 * 2. Charts: an image with the address `figure:<name>` becomes the chart of that name. The alternative text is the caption.
 * 3. Tables and charts get a frame that scrolls sideways on a narrow screen. A keyboard can reach the frame.
 */
import { fileURLToPath } from 'node:url';

import type { HastPluginDefinition, PluginFactoryContext } from 'satteri';

import { useDictionary } from '../i18n/index.ts';
import { isLocale, type Locale } from '../i18n/locales.ts';
import { drawFigure, isFigureId, type Figure } from './figures.ts';
import { insert } from './format.ts';
import { element, join, text, type Markup } from './svg.ts';
import { typeset } from './typeset.ts';

const FIGURE = 'figure:';
const CHAPTER = /[/\\]manual[/\\]([a-z]+)[/\\][^/\\]+\.md$/;
const VERBATIM = new Set(['code', 'pre']);
const HEADINGS = new Set(['h2', 'h3', 'h4']);

/** The language of a chapter is the name of its folder: `src/content/manual/<language>/<chapter>.md`. */
export function localeOfChapter(path: string): Locale | undefined {
  const folder = CHAPTER.exec(path)?.[1];
  return isLocale(folder) ? folder : undefined;
}

/** A frame that scrolls sideways. The page script removes `tabindex` while the content fits. */
function scrollFrame(name: string, ...content: readonly Markup[]): Markup {
  return element('div', { class: 'scroll', role: 'group', 'aria-label': name, tabindex: 0 }, ...content);
}

/** The values of a chart for screen readers. The frame hides the table from the eye, because a table does not clip itself. */
function dataTable(table: NonNullable<Figure['table']>, caption: string): Markup {
  return element(
    'div',
    { class: 'sr-only' },
    element(
      'table',
      { 'aria-label': caption },
      element('thead', {}, element('tr', {}, ...table.head.map((cell) => element('th', { scope: 'col' }, text(cell))))),
      element('tbody', {}, ...table.rows.map((row) => element('tr', {}, ...row.map((cell) => element('td', {}, text(cell)))))),
    ),
  );
}

/** The markup of one chart with its caption. */
export function figureMarkup(name: string, caption: string, locale: Locale): Markup {
  if (!isFigureId(name)) throw new Error(`Unknown chart "${name}". The charts are in src/lib/figures.ts.`);
  const figure = drawFigure(name, locale);
  const label = insert(useDictionary(locale).manual.figure, { title: caption.replace(/\.$/, '') });
  return element(
    'figure',
    { class: 'figure' },
    scrollFrame(label, figure.svg),
    element('figcaption', {}, text(caption)),
    figure.table ? dataTable(figure.table, caption) : join(),
  );
}

/** Plugin for `markdown.processor`. It changes only the chapters of the manual. */
export function manualMarkdown({ fileURL }: PluginFactoryContext): HastPluginDefinition | false {
  const locale = fileURL && localeOfChapter(fileURLToPath(fileURL));
  if (!locale) return false;
  const dictionary = useDictionary(locale).manual;

  return {
    name: 'manual',

    text(node, context) {
      const parent = context.parent(node);
      if (parent.type === 'element' && VERBATIM.has(parent.tagName)) return;
      const value = typeset(node.value, locale);
      if (value !== node.value) context.setField(node, 'value', value);
    },

    element: [
      {
        // A paragraph that holds only a chart image becomes the chart.
        filter: ['p'],
        visit(node, context) {
          const [image, ...rest] = node.children.filter((child) => child.type !== 'text' || child.value.trim() !== '');
          if (rest.length > 0 || image?.type !== 'element' || image.tagName !== 'img') return;
          const { src, alt } = image.properties;
          if (typeof src !== 'string' || !src.startsWith(FIGURE)) return;
          const caption = typeset(typeof alt === 'string' ? alt : '', locale);
          context.replaceNode(node, { type: 'raw', value: figureMarkup(src.slice(FIGURE.length), caption, locale) });
        },
      },
      {
        // The name of a table frame is the heading above the table, or the title of the chapter.
        filter: ['table'],
        visit(node, context) {
          const siblings = context.parent(node).children;
          const heading = siblings
            .slice(0, context.indexOf(node))
            .findLast((sibling) => sibling.type === 'element' && HEADINGS.has(sibling.tagName));
          const chapter: unknown = context.data.astro?.frontmatter.title;
          const title = heading ? context.textContent(heading) : typeof chapter === 'string' ? chapter : '';
          context.wrapNode(node, { raw: scrollFrame(typeset(insert(dictionary.table, { title }), locale)) });
        },
      },
    ],
  };
}
