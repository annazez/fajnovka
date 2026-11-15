/**
 * The shape of an SVG path as numbers: its length, the point at a distance, and the distance nearest to a point.
 * The scene of the title slide moves its trams with it. The browser can answer the same questions about a path
 * element, but it is slow: one build of the scene asked it thirty thousand times.
 *
 * The shape knows the commands that the lines of the scene use: M, L, H, V, Q and T, with absolute or relative numbers.
 */
import { need } from './need.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Shape {
  /** Length of the path. */
  readonly length: number;
  /** The point at a distance from the start, and the direction of the path there in degrees. */
  readonly at: (distance: number) => Point & { readonly angle: number };
  /** The distance from the start of the place on the path that is nearest to a point. */
  readonly nearest: (x: number, y: number) => number;
}

/** One straight part of the path. A curve is many short parts. */
interface Part {
  readonly from: Point;
  readonly to: Point;
  /** Distance from the start of the path to `from`. */
  readonly start: number;
  readonly length: number;
}

/** A curve becomes this number of straight parts. The error is far below one pixel. */
const CURVE_PARTS = 32;
/** The direction of the path at a place is the direction between the points this far behind and ahead. */
const DIRECTION_REACH = 1;

const TOKEN = /([a-z])|(-?\d*\.?\d+(?:e-?\d+)?)/gi;
/** How many numbers each command takes. */
const SIZES: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, Q: 4, T: 2 };

/** The straight parts of a path. */
function parts(d: string): Part[] {
  const list: Part[] = [];
  let total = 0;
  let current: Point = { x: 0, y: 0 };
  /** The control point of the curve before, for the smooth curve command T. */
  let control: Point | undefined;
  let command = '';
  let values: number[] = [];

  const lineTo = (to: Point): void => {
    const length = Math.hypot(to.x - current.x, to.y - current.y);
    // A line to the same point has no length and no direction.
    if (length > 0) list.push({ from: current, to, start: total, length });
    total += length;
    current = to;
  };

  const curveTo = (via: Point, end: Point): void => {
    const start = current;
    for (let part = 1; part <= CURVE_PARTS; part += 1) {
      const t = part / CURVE_PARTS;
      const a = (1 - t) ** 2;
      const b = 2 * (1 - t) * t;
      lineTo({ x: a * start.x + b * via.x + t * t * end.x, y: a * start.y + b * via.y + t * t * end.y });
    }
    control = via;
  };

  /** Draws the command with its numbers. Relative numbers start from the current point. */
  const draw = (): void => {
    const relative = command === command.toLowerCase();
    const number = (index: number): number => need(values[index], 'A number of the path command');
    const x = relative ? current.x : 0;
    const y = relative ? current.y : 0;
    // After each command but a curve, the smooth curve command has no control point to continue.
    const before = control;
    control = undefined;

    switch (command.toUpperCase()) {
      case 'M':
        current = { x: x + number(0), y: y + number(1) };
        // More pairs of numbers after a move are lines.
        command = relative ? 'l' : 'L';
        break;
      case 'L':
        lineTo({ x: x + number(0), y: y + number(1) });
        break;
      case 'H':
        lineTo({ x: x + number(0), y: current.y });
        break;
      case 'V':
        lineTo({ x: current.x, y: y + number(0) });
        break;
      case 'Q':
        curveTo({ x: x + number(0), y: y + number(1) }, { x: x + number(2), y: y + number(3) });
        break;
      default: {
        // T: the control point is the mirror image of the one before. After a line, it is the current point.
        const via = before ? { x: 2 * current.x - before.x, y: 2 * current.y - before.y } : current;
        curveTo(via, { x: x + number(0), y: y + number(1) });
      }
    }
    values = [];
  };

  for (const [, letter, number] of d.matchAll(TOKEN)) {
    if (letter !== undefined) {
      if (SIZES[letter.toUpperCase()] === undefined) throw new Error(`The path command "${letter}" is not known: ${d}`);
      command = letter;
    } else {
      values.push(Number(number));
      if (values.length === SIZES[command.toUpperCase()]) draw();
    }
  }
  if (list.length === 0) throw new Error(`The path has no line: ${d}`);
  return list;
}

/** Reads the `d` attribute of an SVG path. */
export function trace(d: string): Shape {
  const list = parts(d);
  const last = need(list.at(-1), 'The last part of the path');
  const length = last.start + last.length;

  /** The point at a distance: on the part that holds that distance. */
  const pointAt = (distance: number): Point => {
    const target = Math.min(Math.max(distance, 0), length);
    const {
      from,
      to,
      start,
      length: span,
    } = need(
      list.findLast((part) => part.start <= target),
      'A part of the path',
    );
    const share = (target - start) / span;
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
  };

  return {
    length,

    at(distance) {
      // A distance outside the path is one of its ends, with the direction of the path there.
      const place = Math.min(Math.max(distance, 0), length);
      const behind = pointAt(place - DIRECTION_REACH);
      const ahead = pointAt(place + DIRECTION_REACH);
      return { ...pointAt(place), angle: (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI };
    },

    nearest(x, y) {
      let best = 0;
      let bestGap = Infinity;
      for (const { from, to, start, length: span } of list) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        // The place on this part that is nearest to the point, as a share of the part from 0 to 1.
        const share = Math.min(Math.max(((x - from.x) * dx + (y - from.y) * dy) / (span * span), 0), 1);
        const gap = Math.hypot(from.x + dx * share - x, from.y + dy * share - y);
        if (gap < bestGap) {
          bestGap = gap;
          best = start + span * share;
        }
      }
      return best;
    },
  };
}
