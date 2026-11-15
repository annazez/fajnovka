import { expect, test, type Page } from '@playwright/test';

import { SITE } from '../../src/data/site.ts';
import { LOCALES, SLIDES, USUAL_READING, expectSlide, home, openDeck, watchPage, type Locale } from './support.ts';

const CHAPTERS = 15;
const manual = (locale: Locale): string => `${home(locale)}manual/`;
/** The path on the test server of an address of the public site. */
const local = (address: string): string => address.replace(SITE, '');

/** A tool as a page gives it to the browser. */
interface Registered {
  name: string;
  description: string;
  inputSchema: { type: string; properties: Record<string, unknown>; required?: string[] };
  annotations: { readOnlyHint: boolean };
  execute(input: unknown): Promise<string>;
}

/** Gives the page a browser part that takes tools, as a browser with WebMCP does. `place` is where that part lives. */
async function withModelContext(page: Page, place: 'document' | 'navigator' = 'document'): Promise<void> {
  await page.addInitScript((owner) => {
    const tools: unknown[] = [];
    const modelContext = { tools, registerTool: (tool: unknown) => Promise.resolve(void tools.push(tool)) };
    Object.defineProperty(owner === 'document' ? document : navigator, 'modelContext', { value: modelContext });
  }, place);
}

const toolNames = (page: Page): Promise<string[]> =>
  page.evaluate(
    () =>
      (document as unknown as { modelContext?: { tools: Registered[] } }).modelContext?.tools.map(
        (tool) => tool.name,
      ) ?? [],
  );

/** Calls a tool as an agent does and reads its answer. An error of the tool comes back as `{ error }`. */
const call = <Answer>(
  page: Page,
  name: string,
  input: unknown = {},
  place: 'document' | 'navigator' = 'document',
): Promise<Answer & { error?: string }> =>
  page.evaluate(
    async ([tool, argument, owner]) => {
      const host = (owner === 'document' ? document : navigator) as unknown as {
        modelContext: { tools: Registered[] };
      };
      const found = host.modelContext.tools.find((item) => item.name === tool);
      if (!found) return { error: `no tool ${tool}` };
      try {
        return JSON.parse(await found.execute(argument)) as unknown;
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    },
    [name, input, place] as const,
  ) as Promise<Answer & { error?: string }>;

test.describe('files for AI agents', () => {
  test('llms.txt is a text file with one title, and each of its links opens', async ({ request }) => {
    const response = await request.get('/llms.txt');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    const text = await response.text();
    expect(text.startsWith('# Fajnovka\n')).toBe(true);

    const links = [...text.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1] ?? '');
    expect(links.length).toBeGreaterThan(20);
    // The server function and the source code are not on the test server.
    const pages = [
      ...new Set(
        links
          .filter((link) => link.startsWith(SITE) && !link.includes('/api/'))
          .map((link) => link.split('#')[0] ?? ''),
      ),
    ];
    for (const address of pages) expect((await request.get(local(address))).status(), address).toBe(200);

    // A link to a chapter points to a heading that exists.
    const html = await (await request.get('/manual/')).text();
    const anchors = links.filter((link) => link.includes('/manual/#')).map((link) => link.split('#')[1]);
    expect(anchors).toHaveLength(CHAPTERS);
    for (const anchor of anchors) expect(html, anchor).toContain(`id="${anchor}"`);
  });

  for (const locale of LOCALES) {
    test(`the manual as Markdown (${locale}) has each chapter`, async ({ request }) => {
      const response = await request.get(`${home(locale)}manual.md`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/markdown');
      const text = await response.text();
      expect(text.match(/^## \d+ /gm)).toHaveLength(CHAPTERS);
      expect(text).not.toContain('figure:');
    });
  }

  test('the catalogue of resources is JSON in two forms, and each resource exists', async ({ request }) => {
    const manifest = await request.get('/.well-known/ard.json');
    const older = await request.get('/.well-known/ai-catalog.json');
    for (const response of [manifest, older]) {
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
    }
    const { entries } = (await manifest.json()) as { entries: { url: string; identifier: string }[] };
    expect(Object.keys((await manifest.json()) as object)).toEqual(['entries']);
    expect(await older.json()).toMatchObject({ specVersion: '1.0', entries });
    expect(entries.length).toBeGreaterThan(0);
    for (const { url, identifier } of entries) expect((await request.get(local(url))).status(), identifier).toBe(200);
  });

  test('the OpenAPI file describes the server function', async ({ request }) => {
    const response = await request.get('/openapi.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toMatchObject({
      openapi: '3.1.0',
      paths: { '/api/occupancy': { get: { operationId: 'getOccupancy' } } },
    });
  });

  for (const locale of LOCALES) {
    for (const [name, path] of [
      ['deck', home(locale)],
      ['manual', manual(locale)],
    ] as const) {
      test(`the ${name} (${locale}) points to the catalogue and says what it is`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator('link[rel="ard"]')).toHaveAttribute('href', '/.well-known/ard.json');

        const blocks = page.locator('script[type="application/ld+json"]');
        await expect(blocks).toHaveCount(1);
        const data = JSON.parse((await blocks.textContent()) ?? '') as Record<string, unknown>;
        expect(data['@type']).toBe(name === 'deck' ? 'PresentationDigitalDocument' : 'Report');
        expect(data.inLanguage).toBe(locale);
        expect(data.url).toBe(await page.locator('link[rel="canonical"]').getAttribute('href'));
        expect(data.name).toBeTruthy();

        const markdown = page.locator('link[rel="alternate"][type="text/markdown"]');
        if (name === 'manual') await expect(markdown).toHaveAttribute('href', `${home(locale)}manual.md`);
        else await expect(markdown).toHaveCount(0);
      });
    }
  }
});

test.describe('tools of the deck for an AI agent', () => {
  test('the deck gives its three tools to the browser', async ({ page }) => {
    const { problems } = watchPage(page);
    await withModelContext(page);
    await openDeck(page);
    expect(await toolNames(page)).toEqual(['list_slides', 'go_to_slide', 'get_live_occupancy']);

    const schemas = await page.evaluate(() =>
      (document as unknown as { modelContext: { tools: Registered[] } }).modelContext.tools.map(
        ({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations }),
      ),
    );
    for (const { name, description, inputSchema, annotations } of schemas) {
      expect(description.length, name).toBeGreaterThan(40);
      expect(inputSchema.type, name).toBe('object');
      expect(typeof annotations.readOnlyHint, name).toBe('boolean');
    }
    expect(problems).toEqual([]);
  });

  for (const locale of LOCALES) {
    test(`list_slides gives the title and the speaker text of each slide (${locale})`, async ({ page }) => {
      await withModelContext(page);
      await openDeck(page, { locale, slide: 3 });
      const answer = await call<{ current: number; slides: { number: number; title: string; speakerText: string }[] }>(
        page,
        'list_slides',
      );

      expect(answer.current).toBe(3);
      expect(answer.slides.map(({ number }) => number)).toEqual(SLIDES.map((_, index) => index + 1));
      for (const { number, title, speakerText } of answer.slides) {
        expect(title.length, `slide ${number}`).toBeGreaterThan(3);
        expect(speakerText.length, `slide ${number}`).toBeGreaterThan(20);
        expect(`${title}${speakerText}`, `slide ${number}`).not.toMatch(/\u00a0|\n/);
      }
      // The tool gives the title as a viewer reads it: one line of text, with a space where the title has a line break.
      await expect(page.locator('#leak-title')).toHaveText(answer.slides[2]?.title ?? '', { useInnerText: true });
    });
  }

  test('go_to_slide shows the slide, and a number out of the range is an error', async ({ page }) => {
    await withModelContext(page);
    await openDeck(page);

    const { slides } = await call<{ slides: { title: string }[] }>(page, 'list_slides');
    const answer = await call<{ current: number; title: string }>(page, 'go_to_slide', { slide: 4 });
    expect(answer).toEqual({ current: 4, title: slides[3]?.title });
    await expectSlide(page, 4);

    for (const input of [{ slide: 0 }, { slide: 10 }, { slide: '2' }, {}, undefined]) {
      expect((await call(page, 'go_to_slide', input)).error, JSON.stringify(input)).toContain(
        '"slide" must be a whole number from 1 to 9.',
      );
    }
    await expectSlide(page, 4);
  });

  test('get_live_occupancy gives the reading and the share of places in use', async ({ page }) => {
    await withModelContext(page);
    await openDeck(page);
    expect(await call(page, 'get_live_occupancy')).toEqual({ ...USUAL_READING, share: 0.117 });
  });

  test('without live data the reading is the stored one', async ({ page }) => {
    await withModelContext(page);
    await openDeck(page, { reading: null });
    expect(await call(page, 'get_live_occupancy')).toMatchObject({ live: false, vehicles: 224, share: 0.117 });
  });

  test('a browser that keeps the tools on navigator gets them too', async ({ page }) => {
    await withModelContext(page, 'navigator');
    await openDeck(page);
    expect((await call<{ current: number }>(page, 'list_slides', {}, 'navigator')).current).toBe(1);
  });

  test('a browser that refuses the tools has a deck that works', async ({ page }) => {
    const { problems } = watchPage(page);
    await page.addInitScript(() => {
      const refuse = (): never => {
        throw new Error('no tools here');
      };
      Object.defineProperty(document, 'modelContext', { value: { registerTool: refuse } });
    });
    await openDeck(page);
    await page.evaluate(() => document.querySelector<HTMLElement>('[data-action="next"]')?.click());
    await expectSlide(page, 2);
    expect(problems).toEqual([]);
  });
});

test.describe('tools of the manual for an AI agent', () => {
  for (const locale of LOCALES) {
    test(`the manual (${locale}) lists its chapters and gives the text of one`, async ({ page }) => {
      const { problems } = watchPage(page);
      await withModelContext(page);
      await page.goto(manual(locale));
      await expect.poll(() => toolNames(page)).toEqual(['list_chapters', 'get_chapter']);

      const { chapters } = await call<{ chapters: { number: number; title: string; url: string }[] }>(
        page,
        'list_chapters',
      );
      expect(chapters.map(({ number }) => number)).toEqual(Array.from({ length: CHAPTERS }, (_, index) => index + 1));
      const ids = await page
        .locator('section.chapter')
        .evaluateAll((sections) => sections.map((section) => section.id));
      expect(chapters.map(({ url }) => new URL(url).hash)).toEqual(ids.map((id) => `#${id}`));
      for (const { title } of chapters) expect(title).not.toMatch(/\u00a0|^\d|^$/);

      const second = await call<{ number: number; title: string; url: string; markdown: string }>(page, 'get_chapter', {
        chapter: 2,
      });
      expect(second).toMatchObject({ number: 2, title: chapters[1]?.title, url: chapters[1]?.url });
      expect(second.markdown.startsWith(`## 2 ${second.title}`)).toBe(true);
      expect(second.markdown).not.toContain('\n## ');
      expect(second.markdown.length).toBeGreaterThan(1000);

      expect((await call(page, 'get_chapter', { chapter: CHAPTERS + 1 })).error).toContain(
        `"chapter" must be a whole number from 1 to ${CHAPTERS}.`,
      );
      expect(problems).toEqual([]);
    });
  }
});
