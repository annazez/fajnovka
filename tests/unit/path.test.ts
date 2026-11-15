import { describe, expect, test } from 'vitest';

import { scene } from '../../src/data/scene.ts';
import { trace } from '../../src/lib/path.ts';

/** A point with rounded numbers, so that a test can compare it. */
const rounded = ({ x, y, angle }: { x: number; y: number; angle: number }): [number, number, number] => [
  Number(x.toFixed(2)),
  Number(y.toFixed(2)),
  Number(angle.toFixed(1)),
];

describe('shape of a path', () => {
  test('straight lines: the length, the points and the direction', () => {
    // 300 to the right, then 400 down.
    const shape = trace('M100 50H400V450');
    expect(shape.length).toBe(700);
    expect(rounded(shape.at(0))).toEqual([100, 50, 0]);
    expect(rounded(shape.at(150))).toEqual([250, 50, 0]);
    expect(rounded(shape.at(500))).toEqual([400, 250, 90]);
    expect(rounded(shape.at(700))).toEqual([400, 450, 90]);
    // In the corner, the direction is between the two lines.
    expect(rounded(shape.at(300))).toEqual([400, 50, 45]);
  });

  test('a distance outside the path gives the nearest end', () => {
    const shape = trace('M0 0L30 40');
    expect(shape.length).toBe(50);
    expect(rounded(shape.at(-20))).toEqual([0, 0, 53.1]);
    expect(rounded(shape.at(999))).toEqual([30, 40, 53.1]);
  });

  test('relative commands start from the current point', () => {
    const absolute = trace('M10 20L110 20L110 120H60V70');
    const relative = trace('m10 20l100 0l0 100h-50v-50');
    expect(relative.length).toBe(absolute.length);
    for (const distance of [0, 60, 150, 230, 300])
      expect(rounded(relative.at(distance))).toEqual(rounded(absolute.at(distance)));
  });

  test('more pairs of numbers after a move are lines', () => {
    expect(trace('M0 0 100 0 100 100').length).toBe(200);
    expect(trace('m10 10 100 0 0 100').length).toBe(200);
    expect(rounded(trace('m10 10 100 0 0 100').at(200))).toEqual([110, 110, 90]);
  });

  test('a curve goes through its ends and bends to its control point', () => {
    // A quarter turn from (0, 0) to (100, 100) with the corner at (100, 0).
    const shape = trace('M0 0Q100 0 100 100');
    // The curve is shorter than the two sides of the corner and longer than the straight way.
    expect(shape.length).toBeGreaterThan(Math.hypot(100, 100));
    expect(shape.length).toBeLessThan(200);
    expect(shape.length).toBeCloseTo(162.3, 0);
    expect(rounded(shape.at(0)).slice(0, 2)).toEqual([0, 0]);
    expect(rounded(shape.at(shape.length)).slice(0, 2)).toEqual([100, 100]);
    // The middle of the curve: at t = 0.5 the point is (75, 25), and the direction is 45 degrees.
    const middle = shape.at(shape.length / 2);
    expect(middle.x).toBeCloseTo(75, 0);
    expect(middle.y).toBeCloseTo(25, 0);
    expect(middle.angle).toBeCloseTo(45, 0);
    // The direction starts along the first side and ends along the second side.
    expect(shape.at(0).angle).toBeLessThan(2);
    expect(shape.at(shape.length).angle).toBeGreaterThan(88);
  });

  test('a smooth curve continues the curve before it', () => {
    // An S: up to the right, then the mirror image.
    const smooth = trace('M0 100q50 0 100 -50t100 -50');
    const explicit = trace('M0 100Q50 100 100 50Q150 0 200 0');
    expect(smooth.length).toBeCloseTo(explicit.length, 6);
    expect(rounded(smooth.at(smooth.length))).toEqual(rounded(explicit.at(explicit.length)));
    expect(rounded(smooth.at(120))).toEqual(rounded(explicit.at(120)));
    // The same with absolute numbers.
    expect(trace('M0 100Q50 100 100 50T200 0').length).toBeCloseTo(explicit.length, 6);
  });

  test('a smooth curve after a line is a straight line', () => {
    const shape = trace('M0 0H100T200 100');
    expect(shape.length).toBeCloseTo(100 + Math.hypot(100, 100), 6);
    expect(rounded(shape.at(shape.length))).toEqual([200, 100, 45]);
  });

  test('the nearest place on the path to a point', () => {
    const shape = trace('M100 50H400V450');
    // Above the first line: straight down to the line.
    expect(shape.nearest(250, 0)).toBe(150);
    // Right of the second line.
    expect(shape.nearest(900, 250)).toBe(500);
    // Before the start and after the end: the ends.
    expect(shape.nearest(-500, 50)).toBe(0);
    expect(shape.nearest(400, 9000)).toBe(700);
    // A point on the path.
    expect(shape.nearest(400, 60)).toBe(310);
  });

  test('a line to the same point adds nothing', () => {
    const shape = trace('M0 0L0 0H50h0V50');
    expect(shape.length).toBe(100);
    expect(rounded(shape.at(25))).toEqual([25, 0, 0]);
  });

  test('a path without a line, or with a command that the shape does not know, is an error', () => {
    expect(() => trace('')).toThrow('The path has no line');
    expect(() => trace('M10 10')).toThrow('The path has no line: M10 10');
    expect(() => trace('10 20 30 40')).toThrow('The path has no line');
    expect(() => trace('M0 0C10 10 20 20 30 30')).toThrow('The path command "C" is not known');
    expect(() => trace('M0 0A5 5 0 0 1 10 10')).toThrow('The path command "A" is not known');
  });
});

describe('the lines of the tram scene', () => {
  const cases = Object.entries(scene).flatMap(([name, layout]) =>
    layout.lines.map((line) => [name, line.id, layout, line] as const),
  );

  test.each(cases)('%s: each stop of the line "%s" is on the line', (_, __, layout, line) => {
    const shape = trace(line.d);
    for (const { stop: id } of line.visits) {
      const stop = layout.stops.find((item) => item.id === id);
      expect(stop, id).toBeDefined();
      const { x, y } = shape.at(shape.nearest(stop?.x ?? 0, stop?.y ?? 0));
      expect(Math.hypot(x - (stop?.x ?? 0), y - (stop?.y ?? 0)), id).toBeLessThan(1);
    }
  });

  test.each(cases)('%s: the line "%s" starts and ends outside the picture, on a level part', (_, __, layout, line) => {
    const shape = trace(line.d);
    const ends = [shape.at(0), shape.at(shape.length)];
    // One end or the two ends of a line go out of the picture. A tram comes in and goes out there.
    const outside = ends.filter(({ x }) => x < -200 || x > layout.width + 200);
    expect(outside.length).toBeGreaterThan(0);
    for (const { angle } of outside) expect(Math.abs(angle) % 180).toBeCloseTo(0, 5);
  });
});
