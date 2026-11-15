import { expect, test } from '@playwright/test';

import { LOCALES, SLIDES, isPhone, openDeck } from './support.ts';

/** The smallest space between two neighbours in the wordmark, in units of its drawing (1,162 units wide). */
const LETTER_GAP = 6;
/** The grid of a pictogram, the width of its lines, and how far its drawing can be from the centre. */
const GRID = 100;
const LINE_WIDTH = 5;
const CENTRE_TOLERANCE = 2;
/** A slide has a title, one hero size at most, body text and small text. */
const TEXT_SIZES = 4;
/** A box of large text is taller than its letters, so two boxes can share a thin strip: this share of the smaller box. */
const SHARED_STRIP = 0.1;

test.describe('design rules', () => {
  test('the letters of the wordmark do not touch', async ({ page }) => {
    await openDeck(page);
    const gaps = await page.evaluate(() => {
      const outline = (shape: SVGGeometryElement): DOMPoint[] => {
        const points: DOMPoint[] = [];
        for (let at = 0; at <= shape.getTotalLength(); at += 0.5) points.push(shape.getPointAtLength(at));
        return points;
      };
      // Eight letters and three exclamation marks, from left to right.
      const parts = document.querySelectorAll<SVGElement>('#title .wordmark__word path, #title .wordmark__bang');
      const shapes = Array.from(parts, (part) =>
        part instanceof SVGPathElement
          ? outline(part)
          : Array.from(part.querySelectorAll<SVGGeometryElement>('rect'), outline).flat(),
      );
      return shapes.slice(1).map((shape, index) => {
        let gap = Infinity;
        for (const a of shapes[index] ?? []) {
          for (const b of shape) gap = Math.min(gap, Math.hypot(a.x - b.x, a.y - b.y));
        }
        return gap;
      });
    });
    expect(gaps).toHaveLength(10);
    for (const [index, gap] of gaps.entries()) expect(gap, `gap ${index + 1}`).toBeGreaterThanOrEqual(LETTER_GAP);
  });

  test('each pictogram follows the drawing rules', async ({ page }) => {
    await openDeck(page);
    const icons = await page.evaluate(() =>
      Array.from(document.querySelectorAll<SVGSVGElement>('svg.icon'), (icon) => {
        const box = icon.getBBox();
        const parts = Array.from(icon.children, (part) => part.classList);
        const firstLine = parts.findIndex((part) => part.contains('line'));
        return {
          slide: icon.closest('.slide')?.id ?? '',
          box: { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height },
          lines: Array.from(icon.querySelectorAll('.line'), (line) => {
            const { fill, strokeWidth, strokeLinecap, strokeLinejoin } = getComputedStyle(line);
            return { fill, width: Number.parseFloat(strokeWidth), cap: strokeLinecap, join: strokeLinejoin };
          }),
          // An accent shape that comes after a line can cover the line.
          accentAfterLine: parts.some(
            (part, index) => firstLine >= 0 && index > firstLine && part.contains('accent') && !part.contains('line'),
          ),
        };
      }),
    );
    expect(icons.length).toBeGreaterThanOrEqual(12);

    for (const { slide, box, lines, accentAfterLine } of icons) {
      // One line width, with round ends and round corners. A line has no fill.
      expect(lines.length, slide).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line, slide).toEqual({ fill: 'none', width: LINE_WIDTH, cap: 'round', join: 'round' });
      }
      expect(accentAfterLine, slide).toBe(false);
      // The drawing sits in the centre of the grid, and its lines stay inside the grid.
      expect(Math.abs((box.left + box.right) / 2 - GRID / 2), slide).toBeLessThanOrEqual(CENTRE_TOLERANCE);
      expect(Math.abs((box.top + box.bottom) / 2 - GRID / 2), slide).toBeLessThanOrEqual(CENTRE_TOLERANCE);
      expect(Math.min(box.left, box.top), slide).toBeGreaterThanOrEqual(LINE_WIDTH / 2);
      expect(Math.max(box.right, box.bottom), slide).toBeLessThanOrEqual(GRID - LINE_WIDTH / 2);
    }
  });

  for (const locale of LOCALES) {
    for (const [index, id] of SLIDES.entries()) {
      test(`slide ${index + 1} (${id}, ${locale}) keeps its text on the screen, apart and in few sizes`, async ({
        page,
      }, info) => {
        await openDeck(page, { locale, slide: index + 1, motion: false });
        const layout = await page.locator('.slide.is-active').evaluate((slide) => {
          const label = (node: Element): string => `"${(node.textContent ?? '').trim().slice(0, 24)}"`;
          // The text that a person reads: each element with words of its own.
          const texts = Array.from(slide.querySelectorAll<HTMLElement>('*')).filter((node) => {
            if (node.closest('[aria-hidden="true"], .sr-only, svg')) return false;
            const { visibility } = getComputedStyle(node);
            const hasWords = Array.from(node.childNodes).some(
              (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '',
            );
            return hasWords && visibility !== 'hidden' && node.getClientRects().length > 0;
          });
          const unit = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
          const boxes = texts.map((node) => ({ node, box: node.getBoundingClientRect() }));
          const bar = document.querySelector('.controls__bar')?.getBoundingClientRect();
          const source = slide.querySelector<HTMLElement>('.slide__source');

          const shared: string[] = [];
          for (const [first, a] of boxes.entries()) {
            for (const b of boxes.slice(first + 1)) {
              if (a.node.contains(b.node) || b.node.contains(a.node)) continue;
              const width = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
              const height = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top);
              if (width <= 0 || height <= 0) continue;
              const smaller = Math.min(a.box.width * a.box.height, b.box.width * b.box.height);
              shared.push(`${label(a.node)} and ${label(b.node)}: ${((width * height) / smaller).toFixed(2)}`);
            }
          }

          return {
            sizes: [
              ...new Set(texts.map((node) => (Number.parseFloat(getComputedStyle(node).fontSize) / unit).toFixed(1))),
            ],
            shared,
            pastSides: boxes
              .filter(({ box }) => box.left < -0.5 || box.right > innerWidth + 0.5)
              .map((item) => label(item.node)),
            pastTop: boxes.filter(({ box }) => box.top < -0.5).map((item) => label(item.node)),
            underBar: boxes.filter(({ box }) => bar && box.bottom > bar.top + 0.5).map((item) => label(item.node)),
            sourceLines: source
              ? Math.round(
                  source.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(source).lineHeight),
                )
              : 1,
            widerThanScreen: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });

        expect(layout.sizes.length, `sizes ${layout.sizes.join(', ')} rem`).toBeLessThanOrEqual(TEXT_SIZES);
        const overlaps = layout.shared.filter((pair) => Number(pair.split(': ').at(-1)) > SHARED_STRIP);
        expect(overlaps).toEqual([]);
        expect(layout.pastSides).toEqual([]);
        expect(layout.widerThanScreen).toBe(0);
        // The stage shows a slide as one picture. A phone shows a column that scrolls.
        if (!isPhone(info)) {
          expect(layout.pastTop).toEqual([]);
          expect(layout.underBar).toEqual([]);
          expect(layout.sourceLines).toBe(1);
        }
      });
    }
  }
});
