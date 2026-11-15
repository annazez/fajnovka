import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, test, vi } from 'vitest';

import {
  chapterOf,
  deckToolSpecs,
  manualToolSpecs,
  numberFrom,
  plainText,
  registerTools,
  type Tool,
  type ToolSpec,
} from '../../src/lib/tools.ts';
import { manualText } from '../../src/lib/agents.ts';
import { chapters } from './manual-content.ts';

const specs: ToolSpec[] = [...Object.values(deckToolSpecs(9)), ...Object.values(manualToolSpecs(15))];
const ajv = new Ajv2020({ strict: true, allErrors: true });

describe('tools for an AI agent (WebMCP)', () => {
  test('each tool has a unique name of permitted characters, a title and a description', () => {
    expect(specs.map(({ name }) => name)).toEqual([
      'list_slides',
      'go_to_slide',
      'get_live_occupancy',
      'list_chapters',
      'get_chapter',
    ]);
    for (const { name, title, description } of specs) {
      expect(name).toMatch(/^[\w.-]{1,128}$/);
      expect(title.trim(), name).not.toBe('');
      expect(description.length, name).toBeGreaterThan(40);
    }
  });

  test.each(specs)(
    '$name: the input schema is a valid JSON Schema of an object with no unknown fields',
    ({ inputSchema }) => {
      expect(ajv.validateSchema(inputSchema), JSON.stringify(ajv.errors)).toBe(true);
      expect(inputSchema).toMatchObject({ type: 'object', additionalProperties: false });
      const validate = ajv.compile(inputSchema);
      expect(validate({ unknown: 1 })).toBe(false);
    },
  );

  test('a tool without input accepts an empty object', () => {
    for (const { inputSchema } of [
      deckToolSpecs(9).listSlides,
      deckToolSpecs(9).getLiveOccupancy,
      manualToolSpecs(15).listChapters,
    ]) {
      expect(ajv.compile(inputSchema)({})).toBe(true);
    }
  });

  test.each([
    ['go_to_slide', deckToolSpecs(9).goToSlide, 'slide', 9],
    ['get_chapter', manualToolSpecs(15).getChapter, 'chapter', 15],
  ] as const)('%s takes one whole number in the range', (_, { inputSchema, description }, name, max) => {
    const validate = ajv.compile(inputSchema);
    expect(validate({ [name]: 1 })).toBe(true);
    expect(validate({ [name]: max })).toBe(true);
    for (const wrong of [{}, { [name]: 0 }, { [name]: max + 1 }, { [name]: 1.5 }, { [name]: '1' }])
      expect(validate(wrong), JSON.stringify(wrong)).toBe(false);
    expect(description).toMatch(/Call list_\w+ first/);
  });

  test('only the tool that changes the slide is not read-only', () => {
    expect(specs.filter(({ annotations }) => !annotations.readOnlyHint).map(({ name }) => name)).toEqual([
      'go_to_slide',
    ]);
  });

  test('the descriptions give the number of slides and chapters', () => {
    expect(deckToolSpecs(7).listSlides.description).toContain('7 slides');
    expect(manualToolSpecs(12).listChapters.description).toContain('12 chapters');
  });
});

describe('input and text of a tool', () => {
  test('a whole number in the range is taken, any other value is an error with a clear text', () => {
    expect(numberFrom({ slide: 3 }, 'slide', 9)).toBe(3);
    for (const value of [0, 10, 2.5, '3', null, undefined, Number.NaN]) {
      expect(() => numberFrom({ slide: value }, 'slide', 9)).toThrow('"slide" must be a whole number from 1 to 9.');
    }
  });

  test('plain text has ordinary single spaces', () => {
    expect(plainText(' 12\u00a0000  holders\nof a\u00a0pass ')).toBe('12 000 holders of a pass');
  });

  test('a chapter is cut from the Markdown form of the manual', () => {
    const markdown = manualText(
      'en',
      chapters.en.map(({ name, title, order, body }) => ({ slug: name, number: order, title, body })),
    );
    for (const { order, title } of chapters.en) {
      const chapter = chapterOf(markdown, order) ?? '';
      expect(chapter.split('\n')[0]).toBe(`## ${order} ${title}`);
      expect(chapter.match(/^## /gm)).toHaveLength(1);
    }
    // Chapter 1 does not take chapter 10, and a chapter that does not exist gives nothing.
    expect(chapterOf(markdown, 1)).not.toContain('## 10 ');
    expect(chapterOf(markdown, 99)).toBeUndefined();
  });
});

describe('registration of the tools', () => {
  const tool = (name: string, run: Tool['run']): Tool => ({ ...deckToolSpecs(9).listSlides, name, run });

  test('each tool goes to the browser with its description, and its answer is JSON text', async () => {
    const registerTool = vi.fn((_: { name: string; execute(input: unknown): Promise<string> }) => Promise.resolve());
    registerTools({ registerTool }, [
      tool('one', () => ({ ok: true })),
      tool('two', (input) => Promise.resolve({ got: input })),
    ]);

    expect(registerTool).toHaveBeenCalledTimes(2);
    const [first, second] = registerTool.mock.calls.map(([registered]) => registered);
    expect(first).toMatchObject({
      name: 'one',
      description: deckToolSpecs(9).listSlides.description,
      inputSchema: { type: 'object' },
      annotations: { readOnlyHint: true },
    });
    expect(first).not.toHaveProperty('run');
    await expect(first?.execute({})).resolves.toBe('{"ok":true}');
    await expect(second?.execute({ slide: 2 })).resolves.toBe('{"got":{"slide":2}}');
    // An agent that sends no object gives an empty input.
    await expect(second?.execute(undefined)).resolves.toBe('{"got":{}}');
    await expect(second?.execute('text')).resolves.toBe('{"got":{}}');
  });

  test('an error of a tool goes to the agent', async () => {
    const registerTool = vi.fn((_: { execute(input: unknown): Promise<string> }) => undefined);
    registerTools({ registerTool }, [tool('fails', () => numberFrom({}, 'slide', 9))]);
    await expect(registerTool.mock.calls[0]?.[0].execute({})).rejects.toThrow('"slide" must be a whole number');
  });

  test('a browser without WebMCP changes nothing', () => {
    const run = vi.fn();
    expect(() => registerTools(undefined, [tool('one', run)])).not.toThrow();
    expect(() => registerTools({}, [tool('one', run)])).not.toThrow();
    expect(run).not.toHaveBeenCalled();
  });

  test('a browser that refuses one tool still gets the next one', async () => {
    const names: string[] = [];
    const registerTool = vi.fn(({ name }: { name: string }) => {
      if (name === 'throws') throw new Error('refused');
      if (name === 'rejects') return Promise.reject(new Error('refused'));
      names.push(name);
      return Promise.resolve();
    });
    expect(() =>
      registerTools({ registerTool }, [tool('throws', vi.fn()), tool('rejects', vi.fn()), tool('good', vi.fn())]),
    ).not.toThrow();
    await Promise.resolve();
    expect(names).toEqual(['good']);
  });
});
