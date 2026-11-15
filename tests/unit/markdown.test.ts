import { pathToFileURL } from 'node:url';

import { markdownToHtml } from 'satteri';
import { describe, expect, test } from 'vitest';

import { figureMarkup, localeOfChapter, manualMarkdown } from '../../src/lib/markdown.ts';
import { element, join, text } from '../../src/lib/svg.ts';

const chapter = (locale: string): URL => pathToFileURL(`/project/src/content/manual/${locale}/02-problem.md`);
/** Renders Markdown as Astro does: with the plugin and with the front matter of the chapter. */
async function render(source: string, fileURL: URL | undefined, title: string | null = 'The problem'): Promise<string> {
  const astro = {
    frontmatter: title === null ? {} : { title },
    headings: [],
    localImagePaths: new Set<string>(),
    remoteImagePaths: new Set<string>(),
  };
  const { html } = await markdownToHtml(source, {
    ...(fileURL && { fileURL }),
    hastPlugins: [manualMarkdown],
    data: { astro },
  });
  return html.trim();
}

describe('language of a chapter', () => {
  test('the folder of the chapter gives the language', () => {
    expect(localeOfChapter('/site/src/content/manual/cs/01-summary.md')).toBe('cs');
    expect(localeOfChapter('C:\\site\\src\\content\\manual\\en\\01-summary.md')).toBe('en');
  });

  test('other files have no language', () => {
    expect(localeOfChapter('/site/src/content/manual/de/01-summary.md')).toBeUndefined();
    expect(localeOfChapter('/site/README.md')).toBeUndefined();
  });
});

describe('Markdown rules of the manual', () => {
  test('a Czech text gets non-breaking spaces', async () => {
    expect(await render('Jezdí v Ostravě 15 let.', chapter('cs'))).toBe('<p>Jezdí v\u00a0Ostravě 15\u00a0let.</p>');
  });

  test('code stays as the writer typed it', async () => {
    expect(await render('`v Ostravě`', chapter('cs'))).toBe('<p><code>v Ostravě</code></p>');
  });

  test('a chart image becomes a figure with a caption and a table of values', async () => {
    const html = await render('![Passengers carried each year.](figure:passengers)', chapter('en'));
    expect(html).toMatch(
      /^<figure class="figure"><div class="scroll" role="group" aria-label="Figure: Passengers carried each year\. Scroll sideways[^"]*" tabindex="0"><svg class="chart"/,
    );
    expect(html).toContain('<figcaption>Passengers carried each year.</figcaption>');
    expect(html).toContain('<div class="sr-only"><table aria-label="Passengers carried each year.">');
    expect(html).not.toContain('<img');
  });

  test('a chart whose text gives its values has no table', async () => {
    const html = await render('![The budget of the programme.](figure:budget)', chapter('en'));
    expect(html).toContain('<figcaption>The budget of the programme.</figcaption>');
    expect(html).not.toContain('<table');
  });

  test('an unknown chart stops the build', async () => {
    await expect(render('![Caption](figure:pie)', chapter('en'))).rejects.toThrow('Unknown chart "pie"');
    expect(() => figureMarkup('pie', 'Caption', 'en')).toThrow('Unknown chart "pie"');
  });

  test('a chart without a caption stops the build', async () => {
    await expect(render('![](figure:budget)', chapter('en'))).rejects.toThrow('The chart "budget" has no caption');
    expect(() => figureMarkup('budget', ' ', 'en')).toThrow('has no caption');
  });

  test('other images and paragraphs stay', async () => {
    expect(await render('![Photo](https://example.com/a.png)', chapter('en'))).toContain(
      '<img src="https://example.com/a.png" alt="Photo"',
    );
    expect(await render('Text ![Chart](figure:passengers)', chapter('en'))).toContain('<img');
  });

  test('a table gets a scroll frame with the name of the heading above it', async () => {
    const table = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    const html = await render(`### Input data\n\nText.\n\n${table}`, chapter('en'));
    expect(html).toContain(
      '<div class="scroll" role="group" aria-label="Table: Input data. Scroll sideways to see all columns." tabindex="0"><table>',
    );
    expect(html).toContain('</table></div>');
  });

  test('a table before the first heading takes the title of the chapter', async () => {
    const html = await render('| A | B |\n| --- | --- |\n| 1 | 2 |', chapter('en'), 'Risks');
    expect(html).toContain('aria-label="Table: Risks. Scroll sideways to see all columns."');
  });

  test('a table in a chapter without a title and without a heading has a frame all the same', async () => {
    const html = await render('| A | B |\n| --- | --- |\n| 1 | 2 |', chapter('en'), null);
    expect(html).toContain(
      '<div class="scroll" role="group" aria-label="Table: . Scroll sideways to see all columns."',
    );
  });

  test('a file that is not a chapter of the manual does not change', async () => {
    const source = '| A | B |\n| --- | --- |\n| 1 | 2 |\n\n![Chart](figure:passengers)';
    for (const fileURL of [undefined, pathToFileURL('/project/README.md')]) {
      const html = await render(source, fileURL);
      expect(html).not.toContain('class="scroll"');
      expect(html).toContain('<img src="figure:passengers"');
    }
  });
});

describe('markup builder', () => {
  test('text and attribute values are escaped', () => {
    expect(text('a < b & "c"')).toBe('a &lt; b &amp; &quot;c&quot;');
    expect(element('a', { href: '/?a=1&b="2"', hidden: undefined }, text('x > y'))).toBe(
      '<a href="/?a=1&amp;b=&quot;2&quot;">x &gt; y</a>',
    );
  });

  test('elements nest and join', () => {
    expect(join(element('b', {}, text('1')), element('i'))).toBe('<b>1</b><i></i>');
    expect(element('g', { x: 0 }, element('title', {}, text('T')))).toBe('<g x="0"><title>T</title></g>');
  });
});
