import { expect, test, type Page } from '@playwright/test';

import { CYCLE, scene as layouts } from '../../src/data/scene.ts';
import { openDeck } from './support.ts';

/** One moment of the loop: where each tram is, and which seats and waiting places hold a passenger. */
interface Frame {
  time: number;
  trams: { line: string; x: number; y: number; inView: boolean; seats: boolean[] }[];
  stops: boolean[][];
}

const STEP_SECONDS = 0.05;

/** Plays the loop of the scene in small steps and reads the picture at each step. */
const film = (page: Page): Promise<Frame[]> =>
  page.locator('#title [data-scene].is-built').evaluate(
    (root, { cycle, step }) => {
      const animations = root.getAnimations({ subtree: true });
      const cars = [...root.querySelectorAll<HTMLElement>('.scene__car')];
      const lines = [...new Set(cars.map((car) => car.dataset.line ?? ''))];
      const groups = [...root.querySelectorAll('.scene__wait')];
      // A passenger who comes or goes changes in a moment. The passenger counts when more than half of the change is done.
      const shown = (dot: Element): boolean => Number(getComputedStyle(dot).opacity) >= 0.5;
      const frames: Frame[] = [];
      for (let index = 0; index * step < cycle; index += 1) {
        const time = index * step;
        for (const animation of animations) {
          animation.pause();
          animation.currentTime = time * 1000;
        }
        frames.push({
          time,
          trams: lines.map((line) => {
            const own = cars.filter((car) => car.dataset.line === line);
            const boxes = own.map((car) => car.getBoundingClientRect());
            return {
              line,
              x: boxes[0]?.x ?? 0,
              y: boxes[0]?.y ?? 0,
              inView: boxes.every((box) => box.left >= 0 && box.right <= innerWidth),
              seats: own.flatMap((car) => [...car.querySelectorAll('i')].map(shown)),
            };
          }),
          stops: groups.map((group) => [...group.querySelectorAll('i')].map(shown)),
        });
      }
      return frames;
    },
    { cycle: CYCLE, step: STEP_SECONDS },
  );

const count = (row: readonly boolean[]): number => row.filter(Boolean).length;

/** The stays of a tram at its stops: for each stay, how the number of its passengers changes, step by step. */
function stays(frames: readonly Frame[], line: string): number[][] {
  const runs: number[][] = [];
  let run: number[] | null = null;
  frames.slice(1).forEach((frame, index) => {
    const now = frame.trams.find((tram) => tram.line === line);
    const before = frames[index]?.trams.find((tram) => tram.line === line);
    const stands =
      now &&
      before &&
      now.inView &&
      before.inView &&
      Math.abs(now.x - before.x) < 0.01 &&
      Math.abs(now.y - before.y) < 0.01;
    if (!stands) {
      run = null;
      return;
    }
    if (!run) runs.push((run = []));
    const change = count(now.seats) - count(before.seats);
    if (change !== 0) run.push(change);
  });
  return runs.filter((changes) => changes.length > 0);
}

test.describe('the tram scene of the first slide', () => {
  test('the still picture shows a tram at the hub', async ({ page }) => {
    // Without motion, the scene shows one moment of the loop.
    await openDeck(page, { motion: false });
    const distance = await page.locator('#title [data-scene].is-built').evaluate((root) => {
      const centre = (node: Element): { x: number; y: number } => {
        const box = node.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      const hub = root.querySelector('.scene__stop.is-hub');
      if (!hub) throw new Error('The scene has no hub.');
      const { x, y } = centre(hub);
      const cars = Array.from(root.querySelectorAll('.scene__car'), centre);
      // The scene measures in `em`: the font size of its container is the unit.
      const unit = Number.parseFloat(getComputedStyle(root).fontSize);
      return Math.min(...cars.map((car) => Math.hypot(car.x - x, car.y - y))) / unit;
    });
    // The centre of the tram is on the hub, so the nearest carriage is less than one carriage away.
    expect(distance).toBeLessThan(8.6);
  });

  test('passengers leave a tram one at a time, and only then the passengers at the stop board one at a time', async ({
    page,
  }) => {
    await openDeck(page);
    const frames = await film(page);

    let exchanges = 0;
    for (const { id } of layouts.stage.lines) {
      for (const changes of stays(frames, id)) {
        // Each step moves one passenger, and no passenger leaves after the first one has boarded.
        expect(
          changes.every((change) => Math.abs(change) === 1),
          `${id}: ${changes.join(' ')}`,
        ).toBe(true);
        const firstIn = changes.indexOf(1);
        expect(firstIn < 0 || !changes.slice(firstIn).includes(-1), `${id}: ${changes.join(' ')}`).toBe(true);
        if (changes.includes(-1) && changes.includes(1)) exchanges += 1;
      }
    }
    expect(exchanges).toBeGreaterThan(2);
  });

  test('the passengers at a stop change one at a time', async ({ page }) => {
    await openDeck(page);
    const frames = await film(page);
    // The loop has no end: the last frame comes before the first one.
    frames.forEach((frame, index) => {
      const before = frames.at(index - 1);
      frame.stops.forEach((row, stop) => {
        const change = count(row) - count(before?.stops[stop] ?? []);
        expect(Math.abs(change), `stop ${stop} at ${frame.time.toFixed(2)} s`).toBeLessThanOrEqual(1);
      });
    });
  });

  test('a row of passengers never has a hole', async ({ page }) => {
    await openDeck(page);
    for (const frame of await film(page)) {
      for (const row of [...frame.trams.map((tram) => tram.seats), ...frame.stops]) {
        expect(row.lastIndexOf(true), `at ${frame.time.toFixed(2)} s: ${row.map(Number).join('')}`).toBe(
          count(row) - 1,
        );
      }
    }
  });

  test('each carriage has a ring in the colour of the slide, and a link joins the rings of two carriages', async ({
    page,
  }) => {
    await openDeck(page);
    const root = page.locator('#title [data-scene].is-built');
    // The colour that the theme of the slide gives to the role `--bg`.
    const background = await page.locator('#title').evaluate((slide) => {
      const probe = slide.appendChild(document.createElement('i'));
      probe.style.color = 'var(--bg)';
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    expect(background).toMatch(/^rgb\(/);
    const carriages = layouts.stage.lines.reduce((sum, line) => sum + line.carriages, 0);

    await expect(root.locator('.scene__car')).toHaveCount(carriages);
    for (const car of await root.locator('.scene__car').all()) {
      const ring = await car.evaluate((node) => getComputedStyle(node).boxShadow);
      expect(ring).toContain(background);
      // No offset and no blur: the last length is the width of the ring.
      expect(ring.replace(background, '').trim()).toMatch(/^0px 0px 0px [1-9][\d.]*px$/);
    }

    await expect(root.locator('.scene__link')).toHaveCount(carriages - layouts.stage.lines.length);
    for (const link of await root.locator('.scene__link').all()) {
      expect(await link.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(background);
    }
  });
});
