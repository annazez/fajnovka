/**
 * The model behind the tram scene of the title slide. Pure functions: no DOM, no clock.
 *
 * A scene repeats in a fixed cycle. Trams travel between stops and wait there; passengers arrive at stops,
 * board the next tram and leave it later. The functions turn this story into time intervals,
 * and the browser script turns the intervals into animations.
 */

/** A time span in seconds inside the cycle. When `to` is smaller than `from`, the span goes across the end of the cycle. */
export interface Interval {
  readonly from: number;
  readonly to: number;
}

export type Ease = 'in' | 'out' | 'in-out';

/** One move of a tram along its line, between two distances on the path. */
export interface Leg {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly duration: number;
  readonly ease: Ease;
}

/** One stay of a tram at a stop. `alight` is the share of the passengers who leave the tram there. */
export interface Dwell {
  readonly stop: string;
  readonly arrive: number;
  readonly depart: number;
  readonly alight: number;
}

/** The trip of a tram from the point where it enters the picture to the point where it leaves. Times start at zero. */
export interface Journey {
  readonly legs: readonly Leg[];
  readonly dwells: readonly Dwell[];
  readonly duration: number;
}

export interface Waypoint {
  /** Distance along the path of the line. */
  readonly distance: number;
  /** A stop where the tram waits. The first and the last waypoint are outside the picture and have no stop. */
  readonly stop?: string;
  readonly dwell?: number;
  readonly alight?: number;
  /** Fixed time of the move to this waypoint. Without it, the time follows from the distance and the speed. */
  readonly seconds?: number;
}

const MIN_LEG_SECONDS = 1.4;

const easings: Record<Ease, (t: number) => number> = {
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) ** 2,
  'in-out': (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
};

/** Builds the trip of a tram. It slows down before each stop and speeds up after it, as a real tram does. */
export function planJourney(waypoints: readonly Waypoint[], speed: number): Journey {
  const legs: Leg[] = [];
  const dwells: Dwell[] = [];
  let time = 0;
  let from = waypoints[0]?.distance ?? 0;

  waypoints.slice(1).forEach((next, index, moves) => {
    const duration = next.seconds ?? Math.max(MIN_LEG_SECONDS, Math.abs(next.distance - from) / speed);
    const ease: Ease = index === 0 ? 'out' : index === moves.length - 1 ? 'in' : 'in-out';
    legs.push({ from, to: next.distance, start: time, duration, ease });
    from = next.distance;
    time += duration;

    if (next.stop !== undefined) {
      const dwell = next.dwell ?? 0;
      dwells.push({ stop: next.stop, arrive: time, depart: time + dwell, alight: next.alight ?? 0 });
      time += dwell;
    }
  });

  return { legs, dwells, duration: time };
}

/** Where the tram is on its path at a time of its own trip. After the trip it stays at the last point, out of the picture. */
export function distanceAt(journey: Journey, time: number): number {
  let distance = journey.legs[0]?.from ?? 0;
  for (const leg of journey.legs) {
    if (time < leg.start) break;
    const progress = Math.min((time - leg.start) / leg.duration, 1);
    distance = leg.from + (leg.to - leg.from) * easings[leg.ease](progress);
  }
  return distance;
}

/** Times (as a share of the cycle) at which an animation needs a keyframe to follow the trip closely. */
export function keyTimes(journey: Journey, cycle: number, samplesPerLeg: number): number[] {
  const times = new Set<number>([0, 1]);
  for (const leg of journey.legs) {
    for (let sample = 0; sample <= samplesPerLeg; sample += 1) {
      times.add(Math.min((leg.start + (leg.duration * sample) / samplesPerLeg) / cycle, 1));
    }
  }
  return [...times].sort((a, b) => a - b);
}

export interface StopSpec {
  readonly id: string;
  /** Passengers who arrive at the stop in one cycle. */
  readonly rate: number;
  /** At a hub, some passengers who leave a tram wait for the other line. */
  readonly hub?: boolean;
}

export interface TramSpec {
  readonly id: string;
  readonly capacity: number;
  /** Passengers on board when the tram enters the picture. */
  readonly load: number;
  /** Start of the trip inside the cycle, in seconds. */
  readonly offset: number;
  readonly journey: Journey;
}

export interface Presence {
  /** For each stop: for each of its waiting places, the times when a passenger stands there. */
  readonly waiting: ReadonlyMap<string, readonly Interval[][]>;
  /** For each tram: for each of its seats, the times when a passenger sits there. */
  readonly riding: ReadonlyMap<string, readonly Interval[][]>;
}

export const WAITING_PLACES = 6;
const MAX_TRANSFERS = 2;
const WARM_UP_CYCLES = 6;

/**
 * Timing of passengers at a stop, in seconds. As in Mini Metro, passengers move one at a time:
 * first each passenger who leaves the tram, then each passenger who boards it.
 */
export const EXCHANGE = {
  /** After the tram stops, before the first passenger moves. */
  after: 0.3,
  /** Between two passengers. */
  step: 0.2,
  /** The shortest step. A tram with many passengers makes its steps shorter, so that all of them fit in its stay. */
  minStep: 0.1,
  /** Between the last passenger who leaves and the first passenger who boards. */
  pause: 0.25,
  /** The doors close this long before the tram moves. */
  beforeDeparture: 0.25,
} as const;

/** Small seeded generator (mulberry32). The scene must look random and must be the same on each run. */
export function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** One thing that happens at one moment. `order` sorts things that happen at the same moment. */
interface Moment {
  readonly time: number;
  readonly order: number;
  readonly run: (now: number) => void;
}

/** A seat of a tram or a waiting place of a stop. */
interface Spot {
  /** The time at which the passenger of this spot came. It is null when the spot is free. */
  since: number | null;
  /** The times when a passenger was at this spot, after the warm-up. */
  readonly log: Interval[];
}

const spots = (length: number): Spot[] => Array.from({ length }, (): Spot => ({ since: null, log: [] }));
const isTaken = (spot: Spot): spot is Spot & { since: number } => spot.since !== null;
const taken = (row: readonly Spot[]): number => row.filter(isTaken).length;

/** A passenger takes the first free spot of a row. A full row takes no more passengers. */
function take(row: readonly Spot[], now: number): boolean {
  const spot = row.find(({ since }) => since === null);
  if (!spot) return false;
  spot.since = now;
  return true;
}

/**
 * Plays the cycle several times until the picture repeats, then reports who stands and sits where and when.
 *
 * At a stop, the passengers who leave go first, one at a time, from the last seat. Then the passengers who wait board,
 * one at a time, from the last waiting place. So a row of passengers never has a hole, and a viewer can count each move.
 * At a hub, up to two of the passengers who leave stay at the stop: they wait for the other line.
 * The passengers look the same, so the model counts them and does not follow each one.
 */
export function simulate(cycle: number, stops: readonly StopSpec[], trams: readonly TramSpec[], seed = 7): Presence {
  const next = random(seed);
  const hubs = new Set(stops.filter((stop) => stop.hub).map((stop) => stop.id));
  const rounds = WARM_UP_CYCLES + 2;
  const recordFrom = WARM_UP_CYCLES * cycle;

  const places = new Map(stops.map((stop) => [stop.id, spots(WAITING_PLACES)]));
  const fleet = trams.map((tram) => ({ tram, seats: spots(tram.capacity) }));
  /** The waiting places of a stop. A stop that the scene does not show has none: nobody waits there. */
  const placesOf = (stop: string): readonly Spot[] => places.get(stop) ?? [];

  /** The passenger on the last taken spot of a row goes. After the warm-up, the spot records the time of the passenger. */
  const release = (row: readonly Spot[], now: number): boolean => {
    const last = row.findLast(isTaken);
    if (!last) return false;
    if (last.since >= recordFrom && last.since < recordFrom + cycle) {
      last.log.push({ from: last.since % cycle, to: now % cycle });
    }
    const spot: Spot = last;
    spot.since = null;
    return true;
  };

  /** A passenger goes from the last taken place of the stop to the first free seat, if there is a free seat. */
  const board = (seats: readonly Spot[], queue: readonly Spot[], now: number): boolean =>
    taken(seats) < seats.length && release(queue, now) && take(seats, now);

  // The agenda: all moments in the order of time. A moment can add later moments.
  const agenda: Moment[] = [];
  let cursor = 0;
  const before = (a: Moment, b: Moment): boolean => a.time < b.time || (a.time === b.time && a.order < b.order);
  const schedule = (moment: Moment): void => {
    // The new moment goes after the last moment that is not later than it, and never before the moment that runs now.
    const index = Math.max(
      cursor,
      agenda.findLastIndex((other) => !before(moment, other)),
    );
    agenda.splice(index + 1, 0, moment);
  };

  /** One stay of a tram at a stop: plans each passenger who leaves and each passenger who boards. */
  const exchange = (tram: TramSpec, seats: readonly Spot[], dwell: Dwell, arrival: number): void => {
    const queue = placesOf(dwell.stop);
    const end = arrival + (dwell.depart - dwell.arrive) - EXCHANGE.beforeDeparture;

    schedule({
      time: arrival + EXCHANGE.after,
      order: 1,
      run(now) {
        const onBoard = taken(seats);
        const leaving = Math.round(onBoard * dwell.alight);
        const boarding = Math.min(taken(queue), tram.capacity - onBoard + leaving);
        const pause = leaving > 0 && boarding > 0 ? EXCHANGE.pause : 0;
        // A stay with many moves makes its steps shorter, so that all of them fit before the doors close.
        const steps = Math.max(leaving + boarding - 1, 1);
        const step = Math.min(EXCHANGE.step, Math.max(EXCHANGE.minStep, (end - now - pause) / steps));

        // At a hub, some passengers change lines: they come to the stop and stay there when this tram goes.
        let staying = 0;
        for (let index = 0; index < leaving; index += 1) {
          schedule({
            time: now + index * step,
            order: 2,
            run(moment) {
              release(seats, moment);
              if (hubs.has(dwell.stop) && staying < MAX_TRANSFERS && take(queue, moment)) staying += 1;
            },
          });
        }

        const boardNext = (moment: number): void => {
          if (moment > end || taken(queue) <= staying || !board(seats, queue, moment)) return;
          schedule({ time: moment + step, order: 3, run: boardNext });
        };
        schedule({ time: now + leaving * step + pause, order: 3, run: boardNext });
      },
    });
  };

  // Passengers come to the stops at the same moments of each cycle, so the picture repeats.
  const arrivals = stops.flatMap((stop) =>
    Array.from({ length: stop.rate }, (_, index) => ({
      queue: placesOf(stop.id),
      time: ((index + 0.15 + 0.7 * next()) / stop.rate) * cycle,
    })),
  );

  for (let round = 0; round < rounds; round += 1) {
    const base = round * cycle;
    for (const { queue, time } of arrivals)
      agenda.push({ time: base + time, order: 4, run: (now) => take(queue, now) });
    for (const { tram, seats } of fleet) {
      const start = base + tram.offset;
      // The tram comes into the picture with its first passengers.
      agenda.push({
        time: start,
        order: 0,
        run(now) {
          for (const spot of seats.slice(0, tram.load)) spot.since = now;
        },
      });
      // The tram leaves the picture with the passengers who stay on board.
      agenda.push({
        time: start + tram.journey.duration,
        order: 5,
        run(now) {
          while (release(seats, now));
        },
      });
      for (const dwell of tram.journey.dwells) exchange(tram, seats, dwell, start + dwell.arrive);
    }
  }

  agenda.sort((a, b) => a.time - b.time || a.order - b.order);
  // The agenda grows while it runs: the loop also reaches the moments that an earlier moment added.
  for (const [index, moment] of agenda.entries()) {
    cursor = index;
    moment.run(moment.time);
  }

  // A passenger who came before the last round and is still at the stop never got a seat:
  // this place is taken for the full cycle.
  for (const spot of [...places.values()].flat()) {
    if (spot.since !== null && spot.since < recordFrom + cycle)
      spot.log.splice(0, spot.log.length, { from: 0, to: cycle });
  }

  const logs = (row: readonly Spot[]): Interval[][] => row.map(({ log }) => log);
  return {
    waiting: new Map([...places].map(([stop, row]) => [stop, logs(row)])),
    riding: new Map(fleet.map(({ tram, seats }) => [tram.id, logs(seats)])),
  };
}

/** True at the moments when a place is taken; used to show the scene as a still picture. */
export function occupied(intervals: readonly Interval[], time: number): boolean {
  return intervals.some(({ from, to }) => (from <= to ? time >= from && time < to : time >= from || time < to));
}

/** Joins intervals that overlap or touch. The result has no interval across the end of the cycle: such a span becomes two. */
export function merge(intervals: readonly Interval[], cycle: number): Interval[] {
  const flat = intervals
    .flatMap(({ from, to }) =>
      from <= to
        ? [{ from, to }]
        : [
            { from, to: cycle },
            { from: 0, to },
          ],
    )
    .sort((a, b) => a.from - b.from);
  const merged: { from: number; to: number }[] = [];
  for (const span of flat) {
    const last = merged.at(-1);
    if (last && span.from <= last.to) last.to = Math.max(last.to, span.to);
    else merged.push({ ...span });
  }
  return merged;
}

export interface OpacityFrame {
  readonly offset: number;
  readonly opacity: number;
}

/**
 * Keyframes that show an element during the given intervals and hide it between them.
 * `fade` is the time of each change in seconds. Offsets are a share of the cycle.
 */
export function opacityFrames(intervals: readonly Interval[], cycle: number, fade: number): OpacityFrame[] {
  const visibleAtStart = occupied(intervals, 0);
  const changes: { time: number; opacity: number }[] = [];
  for (const { from, to } of merge(intervals, cycle)) {
    changes.push({ time: from, opacity: 1 }, { time: to, opacity: 0 });
  }
  changes.sort((a, b) => a.time - b.time);

  let level = visibleAtStart ? 1 : 0;
  const frames: OpacityFrame[] = [{ offset: 0, opacity: level }];
  // The moment at which the change before ends. The next change waits for it.
  let free = 0;
  for (const change of changes) {
    // A change at the very end of the cycle belongs to the start of the next one.
    if (change.opacity === level || change.time >= cycle) continue;
    const start = Math.max(change.time, free);
    free = Math.min(start + fade, cycle);
    frames.push({ offset: start / cycle, opacity: level }, { offset: free / cycle, opacity: change.opacity });
    level = change.opacity;
  }
  frames.push({ offset: 1, opacity: level });
  return frames;
}

const SCAN_STEP_SECONDS = 0.05;

/**
 * The times in the cycle when a tram covers a point of its line, for example a stop marker.
 * `reach` is the distance from the centre of the tram at which it starts to cover the point.
 */
export function coverage(journey: Journey, offset: number, cycle: number, point: number, reach: number): Interval[] {
  const intervals: Interval[] = [];
  const wrap = (time: number): number => ((time % cycle) + cycle) % cycle;
  let from: number | null = null;

  for (let time = 0; time <= journey.duration + SCAN_STEP_SECONDS; time += SCAN_STEP_SECONDS) {
    const covers = time <= journey.duration && Math.abs(distanceAt(journey, time) - point) < reach;
    if (covers && from === null) from = time;
    if (!covers && from !== null) {
      intervals.push({ from: wrap(offset + from), to: wrap(offset + time) });
      from = null;
    }
  }
  return intervals;
}
