import { describe, expect, test } from 'vitest';

import { EXCHANGE, occupied, planJourney, simulate, WAITING_PLACES, type Interval, type StopSpec, type TramSpec } from '../../src/lib/scene.ts';

const CYCLE = 24;
const EPSILON = 1e-6;

/** A small network: line A stops at "west", "hub" and "east"; line B stops at "north" and "hub". */
const stops: StopSpec[] = [
  { id: 'west', rate: 5 },
  { id: 'hub', rate: 2, hub: true },
  { id: 'east', rate: 2 },
  { id: 'north', rate: 3 },
];
const tram = (id: string, capacity: number, load: number, offset: number, visits: [stop: string, dwell: number, alight: number][]): TramSpec => ({
  id,
  capacity,
  load,
  offset,
  journey: planJourney([{ distance: 0 }, ...visits.map(([stop, dwell, alight], index) => ({ distance: 400 * (index + 1), stop, dwell, alight })), { distance: 400 * (visits.length + 1) }], 200),
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
const inside = (time: number, from: number, to: number): boolean => (from <= to ? time >= from - EPSILON && time <= to + EPSILON : time >= from - EPSILON || time <= to + EPSILON);
const near = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON || Math.abs(Math.abs(a - b) - CYCLE) < EPSILON;

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
        left: seats.filter((seat) => inside(seat.to, from, to)).map((seat) => since(seat.to)).sort((a, b) => a - b),
        boarded: seats.filter((seat) => inside(seat.from, from, to)).map((seat) => since(seat.from)).sort((a, b) => a - b),
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
        expect(freed.some((end) => near(end, wrap(from + time))), `${spec.id} at ${dwell.stop}, ${time.toFixed(2)} s`).toBe(true);
      }
    }
  });

  test('at the hub, a passenger who changes lines stands at the stop from the moment of leaving the tram', () => {
    const hub = (result.waiting.get('hub')?.flat() ?? []).map((place) => place.from);
    const leftAtHub = all.filter(({ dwell }) => dwell.stop === 'hub').flatMap(({ left, from }) => left.map((time) => wrap(from + time)));
    expect(leftAtHub.length).toBeGreaterThan(0);
    expect(leftAtHub.some((time) => hub.some((start) => near(start, time)))).toBe(true);
  });

  test('a seat or a waiting place holds one passenger at a time', () => {
    const rows: Interval[][] = [...result.riding.values(), ...result.waiting.values()].flat();
    for (const row of rows) {
      const spans = row.flatMap(({ from, to }) => (from <= to ? [[from, to]] : [[from, CYCLE], [0, to]])).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
      spans.slice(1).forEach((span, index) => expect(span[0]).toBeGreaterThanOrEqual((spans[index]?.[1] ?? 0) - EPSILON));
    }
  });

  test('a row of passengers never has a hole: the taken seats and places are the first ones', () => {
    const rows: (readonly Interval[][])[] = [...result.riding.values(), ...result.waiting.values()];
    // The moments are between the moves, so no row changes exactly at one of them.
    for (let time = 0.013; time < CYCLE; time += 0.05) {
      for (const row of rows) {
        const taken = row.map((intervals) => occupied(intervals, time));
        expect(taken.lastIndexOf(true), `at ${time.toFixed(3)} s: ${taken.map(Number).join('')}`).toBe(taken.filter(Boolean).length - 1);
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
    const out = seats.filter((seat) => inside(seat.to, from, from + 2.4)).map((seat) => wrap(seat.to - from)).sort((a, b) => a - b);
    const boarded = seats.filter((seat) => inside(seat.from, from + EXCHANGE.after, from + 2.4)).map((seat) => wrap(seat.from - from)).sort((a, b) => a - b);
    expect(out).toHaveLength(8);
    expect(boarded.length).toBeGreaterThan(0);
    expect((out[1] ?? 0) - (out[0] ?? 0)).toBeLessThan(EXCHANGE.step);
    expect(boarded.at(-1)).toBeLessThanOrEqual(2.4 - EXCHANGE.beforeDeparture + EPSILON);
  });
});
