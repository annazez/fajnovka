/**
 * The tools that the pages give to an AI agent in the browser (WebMCP, `document.modelContext`).
 * This file holds what the agent reads about each tool: its name, its description and the shape of its input.
 * The page scripts add the work of each tool (`src/scripts/deck/tools.ts`, `src/scripts/manual.ts`).
 */

/** What an agent reads before it calls a tool. */
export interface ToolSpec {
  /** 1 to 128 characters: letters, digits, `_`, `-` and `.`. */
  name: string;
  /** A short label for a list of tools. */
  title: string;
  /** What the tool does and when to use it. */
  description: string;
  /** JSON Schema of the input object. */
  inputSchema: object;
  annotations: {
    /** True if the tool only reads: it changes nothing on the page and sends nothing. */
    readOnlyHint: boolean;
  };
}

/** A tool with its work. `run` gets the input object and gives a value that JSON can hold. */
export interface Tool extends ToolSpec {
  run(input: Record<string, unknown>): unknown;
}

/** The part of the browser that takes the tools. */
export interface ModelContext {
  registerTool(tool: ToolSpec & { execute(input: unknown): Promise<string> }): unknown;
}

const NO_INPUT = { type: 'object', properties: {}, additionalProperties: false } as const;

/** The input of a tool that needs one whole number from 1 to `max`. */
const oneNumber = (name: string, max: number, description: string): object => ({
  type: 'object',
  properties: { [name]: { type: 'integer', minimum: 1, maximum: max, description } },
  required: [name],
  additionalProperties: false,
});

/** The tools of the deck. `slides` is the number of slides. */
export function deckToolSpecs(slides: number): Record<'listSlides' | 'goToSlide' | 'getLiveOccupancy', ToolSpec> {
  return {
    listSlides: {
      name: 'list_slides',
      title: 'List the slides',
      description: `Lists the ${slides} slides of the Fajnovka pitch deck in their order. Each slide has its number, its title and the text that the speaker says. The answer also gives the number of the slide that is on the screen now.`,
      inputSchema: NO_INPUT,
      annotations: { readOnlyHint: true },
    },
    goToSlide: {
      name: 'go_to_slide',
      title: 'Go to a slide',
      description: 'Shows one slide of the Fajnovka pitch deck on the screen. Call list_slides first to find the number of the slide.',
      inputSchema: oneNumber('slide', slides, `Number of the slide, from 1 to ${slides}.`),
      annotations: { readOnlyHint: false },
    },
    getLiveOccupancy: {
      name: 'get_live_occupancy',
      title: 'Read the live occupancy',
      description:
        'Reads how full the public transport vehicles of DPO in Ostrava are at this minute: vehicles on the road, passengers, places, and the share of places in use (0 to 1). The source is the public dashboard of DPO. If "live" is false, the answer is a stored reading, not the reading of this minute.',
      inputSchema: NO_INPUT,
      annotations: { readOnlyHint: true },
    },
  };
}

/** The tools of the manual. `chapters` is the number of chapters. */
export function manualToolSpecs(chapters: number): Record<'listChapters' | 'getChapter', ToolSpec> {
  return {
    listChapters: {
      name: 'list_chapters',
      title: 'List the chapters',
      description: `Lists the ${chapters} chapters of the Fajnovka manual, the full proposal of a loyalty programme for public transport in Ostrava. Each chapter has its number, its title and its address.`,
      inputSchema: NO_INPUT,
      annotations: { readOnlyHint: true },
    },
    getChapter: {
      name: 'get_chapter',
      title: 'Read a chapter',
      description: 'Gives the full text of one chapter of the Fajnovka manual as Markdown. A chart is given as its caption and a table of its values. Call list_chapters first to find the number of the chapter.',
      inputSchema: oneNumber('chapter', chapters, `Number of the chapter, from 1 to ${chapters}.`),
      annotations: { readOnlyHint: true },
    },
  };
}

/** Text for an agent: ordinary spaces only, one between two words. The pages use non-breaking spaces for the eye. */
export const plainText = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The whole number that a tool got under `name`. A value out of the range is an error that the agent can read. */
export function numberFrom(input: Record<string, unknown>, name: string, max: number): number {
  const value = input[name];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new RangeError(`"${name}" must be a whole number from 1 to ${max}.`);
  }
  return value;
}

/** One chapter of the manual in Markdown (see `manualText` in agents.ts): from its `## <number> ` heading to the next one. */
export function chapterOf(markdown: string, chapter: number): string | undefined {
  const parts = markdown.split(/^(?=## \d+ )/m);
  return parts.find((part) => part.startsWith(`## ${chapter} `))?.trim();
}

/**
 * Gives the tools to the browser. A browser without WebMCP, or a browser that refuses a tool, changes nothing on the page.
 * The answer of a tool goes to the agent as JSON text.
 */
export function registerTools(context: Partial<ModelContext> | undefined, tools: readonly Tool[]): void {
  if (typeof context?.registerTool !== 'function') return;
  for (const { run, ...spec } of tools) {
    const execute = async (input: unknown): Promise<string> => JSON.stringify(await run(typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}));
    try {
      // New browsers give a promise, the first ones gave nothing.
      void Promise.resolve(context.registerTool({ ...spec, execute })).catch(() => undefined);
    } catch {
      // The page works without the tool.
    }
  }
}
