/** The script of the manual page: scroll frames of tables and charts, and the tools for an AI agent. */
import { chapterOf, manualToolSpecs, numberFrom, plainText } from '../lib/tools.ts';
import { offerTools } from './tools.ts';

// A frame is a tab stop only while its content is wider than the frame, so a keyboard user does not stop at each table.
const scrollFrames = document.querySelectorAll<HTMLElement>('.scroll');

function update(): void {
  for (const frame of scrollFrames) {
    if (frame.scrollWidth > frame.clientWidth) frame.setAttribute('tabindex', '0');
    else frame.removeAttribute('tabindex');
  }
}

new ResizeObserver(update).observe(document.documentElement);
update();

// The tools read the chapters from the page, and the text of a chapter from the Markdown form of the manual.
const chapters = Array.from(document.querySelectorAll<HTMLElement>('.chapter'), (section, index) => ({
  number: index + 1,
  title: plainText(section.querySelector('.chapter__title > :last-child')?.textContent ?? ''),
  url: new URL(`#${section.id}`, location.href).href,
}));
const markdownAddress = document.querySelector<HTMLLinkElement>('link[rel="alternate"][type="text/markdown"]')?.href;
const specs = manualToolSpecs(chapters.length);
let markdown: Promise<string> | undefined;

offerTools([
  { ...specs.listChapters, run: () => ({ chapters }) },
  {
    ...specs.getChapter,
    async run(input) {
      const chapter = chapters[numberFrom(input, 'chapter', chapters.length) - 1];
      if (!markdownAddress || !chapter) throw new Error('The text of the manual is not available.');
      markdown ??= fetch(markdownAddress).then((response) =>
        response.ok ? response.text() : Promise.reject(new Error('The text of the manual is not available.')),
      );
      return { ...chapter, markdown: chapterOf(await markdown, chapter.number) ?? '' };
    },
  },
]);
