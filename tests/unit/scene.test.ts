import { describe, expect, test } from 'vitest';

import {
  coverage,
  distanceAt,
  EXCHANGE,
  keyTimes,
  merge,
  occupied,
  opacityFrames,
  planJourney,
  random,
  simulate,
  WAITING_PLACES,
  type Interval,
  type StopSpec,
  type TramSpec,
} from '../../src/lib/scene.ts';

const CYCLE = 24;
const EPSILON = 1e-6;

/** A small network: line A stops at "west", "hub" and "east"; line B stops at "north" and "hub". */
const stops: StopSpec[] = [
  { id: 'west', rate: 5 },
  { id: 'hub', rate: 2, hub: true },
  { id: 'east', rate: 2 },
  { id: 'north', rate: 3 },
];
const tram = (
  id: string,
  capacity: number,
  load: number,
  offset: number,
  visits: [stop: string, dwell: number, alight: number][],
): TramSpec => ({
  id,
  capacity,
  load,
  offset,
  journey: planJourney(
    [
      { distance: 0 },
      ...visits.map(([stop, dwell, alight], index) => ({ distance: 400 * (index + 1), stop, dwell, alight })),
      { distance: 400 * (visits.length + 1) },
    ],
    200,
  ),
});
const trams: TramSpec[] = [
  tram('a', 8, 4, 0, [
    ['west', 2.4, 0.25],
    ['hub', 2.4, 0.5],
    ['east', 2.4, 0.34],
  ]),
  tram('b', 4, 2, 9, [
    ['north', 1.8, 0.5],
    ['hub', 1.8, 0.5],
  ]),
];

const wrap = (time: number): number => ((time % CYCLE) + CYCLE) % CYCLE;
const inside = (time: number, from: number, to: number): boolean =>
  from <= to ? time >= from - EPSILON && time <= to + EPSILON : time >= from - EPSILON || time <= to + EPSILON;
const near = (a: number, b: number): boolean =>
  Math.abs(a - b) < EPSILON || Math.abs(Math.abs(a - b) - CYCLE) < EPSILON;

/** For each stay of each tram: when passengers left their seats and when they took seats, in the order of time. */
function stays(result: ReturnType<typeof simulate>) {
  return trams.flatMap((spec) =>
    spec.journey.dwells.map((dwell) => {
      const from = wrap(spec.offset + dwell.arrive);
      const to = wrap(spec.offset + dwell.depart);
      const seats = result.riding.get(spec.id)?.flat() ?? [];
      const since = (time: number): number => wrap(time - from);
      return {
        tram: spec,
        dwell,
        from,
        to,
        left: seats
          .filter((seat) => inside(seat.to, from, to))
          .map((seat) => since(seat.to))
          .sort((a, b) => a - b),
        boarded: seats
          .filter((seat) => inside(seat.from, from, to))
          .map((seat) => since(seat.from))
          .sort((a, b) => a - b),
      };
    }),
  );
}

describe('passengers at a stop', () => {
  const result = simulate(CYCLE, stops, trams);
  const all = stays(result);

  test('the scene has passengers who leave and passengers who board', () => {
    expect(all.reduce((sum, stay) => sum + stay.left.length, 0)).toBeGreaterThan(4);
    expect(all.reduce((sum, stay) => sum + stay.boarded.length, 0)).toBeGreaterThan(4);
  });

  test('each passenger who leaves goes before the first passenger who boards', () => {
    for (const { left, boarded, tram: spec, dwell } of all) {
      if (left.length === 0 || boarded.length === 0) continue;
      const lastOut = left.at(-1) ?? 0;
      const firstIn = boarded[0] ?? 0;
      expect(firstIn - lastOut, `${spec.id} at ${dwell.stop}`).toBeGreaterThanOrEqual(EXCHANGE.pause - EPSILON);
    }
  });

  test('passengers move one at a time, with a step between them', () => {
    for (const { left, boarded, tram: spec, dwell } of all) {
      for (const times of [left, boarded]) {
        times.slice(1).forEach((time, index) => {
          const step = time - (times[index] ?? 0);
          expect(step, `${spec.id} at ${dwell.stop}`).toBeGreaterThanOrEqual(EXCHANGE.minStep - EPSILON);
          expect(step, `${spec.id} at ${dwell.stop}`).toBeLessThanOrEqual(EXCHANGE.step + EPSILON);
        });
      }
    }
  });

  test('nobody moves before the tram has stopped or after its doors close', () => {
    for (const { left, boarded, dwell, tram: spec } of all) {
      const stay = dwell.depart - dwell.arrive;
      for (const time of [...left, ...boarded]) {
        expect(time, `${spec.id} at ${dwell.stop}`).toBeGreaterThanOrEqual(EXCHANGE.after - EPSILON);
        expect(time, `${spec.id} at ${dwell.stop}`).toBeLessThanOrEqual(stay - EXCHANGE.beforeDeparture + EPSILON);
      }
    }
  });

  test('each passenger who boards leaves a waiting place of that stop at the same moment', () => {
    for (const { boarded, from, dwell, tram: spec } of all) {
      const freed = (result.waiting.get(dwell.stop)?.flat() ?? []).map((place) => place.to);
      for (const time of boarded) {
        expect(
          freed.some((end) => near(end, wrap(from + time))),
          `${spec.id} at ${dwell.stop}, ${time.toFixed(2)} s`,
        ).toBe(true);
      }
    }
  });

  test('at the hub, a passenger who changes lines stands at the stop from the moment of leaving the tram', () => {
    const hub = (result.waiting.get('hub')?.flat() ?? []).map((place) => place.from);
    const leftAtHub = all
      .filter(({ dwell }) => dwell.stop === 'hub')
      .flatMap(({ left, from }) => left.map((time) => wrap(from + time)));
    expect(leftAtHub.length).toBeGreaterThan(0);
    expect(leftAtHub.some((time) => hub.some((start) => near(start, time)))).toBe(true);
  });

  test('a seat or a waiting place holds one passenger at a time', () => {
    const rows: Interval[][] = [...result.riding.values(), ...result.waiting.values()].flat();
    for (const row of rows) {
      const spans = row
        .flatMap(({ from, to }) =>
          from <= to
            ? [[from, to]]
            : [
                [from, CYCLE],
                [0, to],
              ],
        )
        .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
      spans
        .slice(1)
        .forEach((span, index) => expect(span[0]).toBeGreaterThanOrEqual((spans[index]?.[1] ?? 0) - EPSILON));
    }
  });

  test('a row of passengers never has a hole: the taken seats and places are the first ones', () => {
    const rows: (readonly Interval[][])[] = [...result.riding.values(), ...result.waiting.values()];
    // The moments are between the moves, so no row changes exactly at one of them.
    for (let time = 0.013; time < CYCLE; time += 0.05) {
      for (const row of rows) {
        const taken = row.map((intervals) => occupied(intervals, time));
        expect(taken.lastIndexOf(true), `at ${time.toFixed(3)} s: ${taken.map(Number).join('')}`).toBe(
          taken.filter(Boolean).length - 1,
        );
      }
    }
  });

  test('the result has one row for each seat and each waiting place', () => {
    expect(result.riding.get('a')).toHaveLength(8);
    expect(result.riding.get('b')).toHaveLength(4);
    for (const stop of stops) expect(result.waiting.get(stop.id)).toHaveLength(WAITING_PLACES);
  });

  test('the same seed gives the same scene, another seed gives another scene', () => {
    expect(simulate(CYCLE, stops, trams)).toEqual(result);
    expect(simulate(CYCLE, stops, trams, 8)).not.toEqual(result);
  });

  test('a tram with many passengers makes shorter steps, and all of them fit in its stay', () => {
    const crowd = simulate(CYCLE, [{ id: 'west', rate: 6 }], [tram('a', 8, 8, 0, [['west', 2.4, 1]])]);
    const [stay] = trams.slice(0, 1).map((spec) => spec.journey.dwells[0]);
    const from = wrap((stay?.arrive ?? 0) + 0);
    const seats = crowd.riding.get('a')?.flat() ?? [];
    const out = seats
      .filter((seat) => inside(seat.to, from, from + 2.4))
      .map((seat) => wrap(seat.to - from))
      .sort((a, b) => a - b);
    const boarded = seats
      .filter((seat) => inside(seat.from, from + EXCHANGE.after, from + 2.4))
      .map((seat) => wrap(seat.from - from))
      .sort((a, b) => a - b);
    expect(out).toHaveLength(8);
    expect(boarded.length).toBeGreaterThan(0);
    expect((out[1] ?? 0) - (out[0] ?? 0)).toBeLessThan(EXCHANGE.step);
    expect(boarded.at(-1)).toBeLessThanOrEqual(2.4 - EXCHANGE.beforeDeparture + EPSILON);
  });
});

/** A trip with a stay of 2 s at 400, a stop without a stay at 600, and a last move with a fixed time. */
const trip = planJourney(
  [
    { distance: 0 },
    { distance: 400, stop: 'a', dwell: 2, alight: 0.5 },
    { distance: 600, stop: 'b' },
    { distance: 1000, seconds: 3 },
  ],
  200,
);

describe('the trip of a tram', () => {
  test('a trip is a chain of moves and stays', () => {
    expect(trip.legs).toEqual([
      { from: 0, to: 400, start: 0, duration: 2, ease: 'out' },
      // A short move takes the least time of a move, not the time that the speed gives.
      { from: 400, to: 600, start: 4, duration: 1.4, ease: 'in-out' },
      { from: 600, to: 1000, start: 5.4, duration: 3, ease: 'in' },
    ]);
    expect(trip.dwells).toEqual([
      { stop: 'a', arrive: 2, depart: 4, alight: 0.5 },
      // A stop without a stay time: the tram goes on at once, and nobody leaves.
      { stop: 'b', arrive: 5.4, depart: 5.4, alight: 0 },
    ]);
    expect(trip.duration).toBeCloseTo(8.4);
  });

  test('a trip with one move slows down from the first moment', () => {
    expect(planJourney([{ distance: 0 }, { distance: 600 }], 200).legs).toEqual([
      { from: 0, to: 600, start: 0, duration: 3, ease: 'out' },
    ]);
  });

  test('no move gives an empty trip', () => {
    expect(planJourney([], 200)).toEqual({ legs: [], dwells: [], duration: 0 });
    expect(planJourney([{ distance: 50 }], 200)).toEqual({ legs: [], dwells: [], duration: 0 });
    expect(distanceAt(planJourney([], 200), 3)).toBe(0);
  });

  test('the tram slows down before a stop and speeds up after it', () => {
    expect(distanceAt(trip, -1)).toBe(0);
    expect(distanceAt(trip, 0)).toBe(0);
    // Half of the time of the first move: three quarters of the way.
    expect(distanceAt(trip, 1)).toBeCloseTo(300);
    // The stay at the stop.
    expect(distanceAt(trip, 3)).toBe(400);
    // The move between two stops is slow at its two ends.
    expect(distanceAt(trip, 4.35)).toBeCloseTo(412.5);
    expect(distanceAt(trip, 4.7)).toBeCloseTo(500);
    expect(distanceAt(trip, 5.05)).toBeCloseTo(587.5);
    // Half of the time of the last move: one quarter of the way.
    expect(distanceAt(trip, 6.9)).toBeCloseTo(700);
    // After the trip, the tram stays at the last point.
    expect(distanceAt(trip, 100)).toBe(1000);
  });

  test('the key times follow each move, as shares of the cycle from 0 to 1', () => {
    const times = keyTimes(trip, 24, 2);
    const expected = [0, 1, 2, 4, 4.7, 5.4, 6.9, 8.4].map((seconds) => seconds / 24);
    expect(times).toHaveLength(expected.length + 1);
    expected.forEach((share, index) => expect(times[index]).toBeCloseTo(share));
    expect(times.at(-1)).toBe(1);
    // A cycle that is shorter than the trip: no key time is after the end of the cycle.
    expect(keyTimes(trip, 6, 2).every((share) => share >= 0 && share <= 1)).toBe(true);
    expect(keyTimes(trip, 6, 2).at(-1)).toBe(1);
  });

  test('a tram covers a point of its line while it is near', () => {
    // The tram comes to the stop at 400, stays there, and goes on.
    const [near, ...others] = coverage(trip, 0, 24, 400, 50);
    expect(others).toEqual([]);
    expect(near?.from).toBeCloseTo(1.3);
    expect(near?.to).toBeCloseTo(4.6);
    // The same trip later in the cycle: the time goes across the end of the cycle.
    const [late] = coverage(trip, 22, 24, 400, 50);
    expect(late?.from).toBeCloseTo(23.3);
    expect(late?.to).toBeCloseTo(2.6);
    // The tram is at its last point until the trip ends.
    const [last] = coverage(trip, 0, 24, 1000, 50);
    expect(last?.to).toBeCloseTo(8.45);
    expect(coverage(trip, 0, 24, 5000, 50)).toEqual([]);
  });
});

describe('times of a place', () => {
  test('a place is taken from the start of an interval to its end', () => {
    expect(occupied([{ from: 2, to: 5 }], 2)).toBe(true);
    expect(occupied([{ from: 2, to: 5 }], 5)).toBe(false);
    // An interval across the end of the cycle.
    expect(occupied([{ from: 22, to: 3 }], 23)).toBe(true);
    expect(occupied([{ from: 22, to: 3 }], 1)).toBe(true);
    expect(occupied([{ from: 22, to: 3 }], 10)).toBe(false);
    expect(occupied([], 10)).toBe(false);
  });

  test('intervals that overlap or touch become one', () => {
    expect(
      merge(
        [
          { from: 10, to: 11 },
          { from: 4, to: 7 },
          { from: 2, to: 5 },
          { from: 7, to: 8 },
          { from: 2.5, to: 3 },
        ],
        24,
      ),
    ).toEqual([
      { from: 2, to: 8 },
      { from: 10, to: 11 },
    ]);
    expect(merge([], 24)).toEqual([]);
  });

  test('an interval across the end of the cycle becomes two', () => {
    expect(merge([{ from: 22, to: 3 }], 24)).toEqual([
      { from: 0, to: 3 },
      { from: 22, to: 24 },
    ]);
  });

  /** Frames with times in seconds, which are easier to read than shares of the cycle. */
  const frames = (intervals: readonly Interval[], fade = 0.3): [seconds: number, opacity: number][] =>
    opacityFrames(intervals, 24, fade).map(({ offset, opacity }) => [Number((offset * 24).toFixed(3)), opacity]);

  test('an element comes in and goes out in the fade time', () => {
    expect(frames([{ from: 6, to: 12 }])).toEqual([
      [0, 0],
      [6, 0],
      [6.3, 1],
      [12, 1],
      [12.3, 0],
      [24, 0],
    ]);
  });

  test('an element that is there across the end of the cycle starts visible', () => {
    expect(frames([{ from: 22, to: 3 }])).toEqual([
      [0, 1],
      [3, 1],
      [3.3, 0],
      [22, 0],
      [22.3, 1],
      [24, 1],
    ]);
  });

  test('a change waits until the change before it has ended', () => {
    expect(frames([{ from: 5, to: 5.1 }])).toEqual([
      [0, 0],
      [5, 0],
      [5.3, 1],
      [5.3, 1],
      [5.6, 0],
      [24, 0],
    ]);
  });

  test('an element that is never there, or always there, does not change', () => {
    expect(frames([])).toEqual([
      [0, 0],
      [24, 0],
    ]);
    expect(frames([{ from: 0, to: 24 }])).toEqual([
      [0, 1],
      [24, 1],
    ]);
  });

  test('a change does not go past the end of the cycle', () => {
    expect(frames([{ from: 23.9, to: 2 }]).every(([seconds]) => seconds <= 24)).toBe(true);
  });
});

describe('special cases of the scene', () => {
  test('the generator gives the same numbers for the same seed, from 0 to 1', () => {
    const first = random(7);
    const second = random(7);
    const values = Array.from({ length: 50 }, () => first());
    expect(values).toEqual(Array.from({ length: 50 }, () => second()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(new Set(values).size).toBe(50);
    expect(random(8)()).not.toBe(random(7)());
  });

  test('a passenger whom no tram takes stands at the stop for the full cycle', () => {
    const { waiting, riding } = simulate(CYCLE, [{ id: 'lonely', rate: 2 }], []);
    expect(riding.size).toBe(0);
    // The stop fills up and takes no more passengers.
    expect(waiting.get('lonely')).toEqual(Array.from({ length: WAITING_PLACES }, () => [{ from: 0, to: CYCLE }]));
  });

  test('at a place that the scene does not show, passengers leave the tram and nobody boards', () => {
    const { waiting, riding } = simulate(CYCLE, [], [tram('a', 4, 2, 0, [['nowhere', 2.4, 0.5]])]);
    expect(waiting.size).toBe(0);
    const [first = [], second = [], ...free] = riding.get('a') ?? [];
    expect(free).toEqual([[], []]);
    // One of the two passengers leaves at the place. The other one stays to the end of the trip.
    expect(second).toHaveLength(1);
    expect(second[0]?.from).toBe(0);
    expect(second[0]?.to).toBeCloseTo(2 + EXCHANGE.after);
    expect(first).toHaveLength(1);
    expect(first[0]?.from).toBe(0);
    // The move to the place, the stay there, and the move out of the picture.
    expect(first[0]?.to).toBeCloseTo(2 + 2.4 + 2);
  });

  test('two trams that start at the same moment do not disturb each other', () => {
    const pair = [tram('a', 4, 2, 5, [['west', 2, 0.5]]), tram('b', 4, 4, 5, [['east', 2, 1]])];
    const { riding } = simulate(CYCLE, stops, pair);
    expect((riding.get('a') ?? []).filter((seat) => occupied(seat, 5.1))).toHaveLength(2);
    expect((riding.get('b') ?? []).filter((seat) => occupied(seat, 5.1))).toHaveLength(4);
  });
});
