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

  for (let index = 1; index < waypoints.length; index += 1) {
    const previous = waypoints[index - 1];
    const next = waypoints[index];
    if (!previous || !next) continue;

    const duration = next.seconds ?? Math.max(MIN_LEG_SECONDS, Math.abs(next.distance - previous.distance) / speed);
    const ease: Ease = index === 1 ? 'out' : index === waypoints.length - 1 ? 'in' : 'in-out';
    legs.push({ from: previous.distance, to: next.distance, start: time, duration, ease });
    time += duration;

    if (next.stop !== undefined) {
      const dwell = next.dwell ?? 0;
      dwells.push({ stop: next.stop, arrive: time, depart: time + dwell, alight: next.alight ?? 0 });
      time += dwell;
    }
  }

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
const ALIGHT_AFTER = 0.25;
const BOARD_AFTER = 0.6;
const SEATED_AFTER = 0.9;
const TRANSFER_AFTER = 1.2;
const MAX_TRANSFERS = 2;
const WARM_UP_CYCLES = 6;

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

interface Timed {
  readonly time: number;
  /** Order of actions that happen at the same time. */
  readonly order: number;
}

type Action =
  | (Timed & { readonly kind: 'spawn'; readonly stop: string })
  | (Timed & { readonly kind: 'enter'; readonly tram: TramSpec })
  | (Timed & { readonly kind: 'exit'; readonly tram: TramSpec })
  | (Timed & { readonly kind: 'alight'; readonly tram: TramSpec; readonly dwell: Dwell })
  | (Timed & { readonly kind: 'board'; readonly tram: TramSpec; readonly dwell: Dwell })
  | (Timed & { readonly kind: 'transfer'; readonly tram: TramSpec; readonly dwell: Dwell });

/** All actions of one cycle, in the order in which they happen. */
function script(cycle: number, stops: readonly StopSpec[], trams: readonly TramSpec[], seed: number): Action[] {
  const next = random(seed);
  const actions: Action[] = [];
  const wrap = (time: number): number => ((time % cycle) + cycle) % cycle;

  for (const stop of stops) {
    for (let index = 0; index < stop.rate; index += 1) {
      actions.push({ time: wrap(((index + 0.15 + 0.7 * next()) / stop.rate) * cycle), order: 3, kind: 'spawn', stop: stop.id });
    }
  }

  for (const tram of trams) {
    actions.push({ time: wrap(tram.offset), order: 0, kind: 'enter', tram });
    actions.push({ time: wrap(tram.offset + tram.journey.duration), order: 4, kind: 'exit', tram });
    for (const dwell of tram.journey.dwells) {
      actions.push({ time: wrap(tram.offset + dwell.arrive + ALIGHT_AFTER), order: 1, kind: 'alight', tram, dwell });
      actions.push({ time: wrap(tram.offset + dwell.arrive + BOARD_AFTER), order: 2, kind: 'board', tram, dwell });
      actions.push({ time: wrap(tram.offset + dwell.arrive + TRANSFER_AFTER), order: 3, kind: 'transfer', tram, dwell });
    }
  }

  return actions.sort((a, b) => a.time - b.time || a.order - b.order);
}

/**
 * Plays the cycle several times until the picture repeats, then reports who stands and sits where and when.
 * A passenger takes the lowest free place and the highest taken place boards first, so a row of passengers has no holes.
 */
export function simulate(cycle: number, stops: readonly StopSpec[], trams: readonly TramSpec[], seed = 7): Presence {
  const actions = script(cycle, stops, trams, seed);
  const hubs = new Set(stops.filter((stop) => stop.hub).map((stop) => stop.id));

  // A place holds the absolute time at which its passenger came, or null when it is free.
  const places = new Map(stops.map((stop) => [stop.id, new Array<number | null>(WAITING_PLACES).fill(null)]));
  const seats = new Map(trams.map((tram) => [tram.id, new Array<number | null>(tram.capacity).fill(null)]));
  const waiting = new Map(stops.map((stop) => [stop.id, Array.from({ length: WAITING_PLACES }, (): Interval[] => [])]));
  const riding = new Map(trams.map((tram) => [tram.id, Array.from({ length: tram.capacity }, (): Interval[] => [])]));
  // Passengers who left a tram at a hub and now walk to the waiting place: one count for each stay of a tram.
  const transfers = new Map<Dwell, number>();
  const recordFrom = WARM_UP_CYCLES * cycle;
  const wrap = (time: number): number => time % cycle;

  /** Frees a place or seat and, after the warm-up, records the time the passenger spent there. */
  const release = (log: Interval[] | undefined, since: number, now: number): void => {
    if (since >= recordFrom && since < recordFrom + cycle) log?.push({ from: wrap(since), to: wrap(now) });
  };

  const arrive = (stopId: string, now: number): void => {
    const row = places.get(stopId);
    const free = row?.indexOf(null) ?? -1;
    if (row && free >= 0) row[free] = now;
  };

  const leaveTram = (tram: TramSpec, count: number, now: number): void => {
    const row = seats.get(tram.id) ?? [];
    for (let seat = row.length - 1, left = count; seat >= 0 && left > 0; seat -= 1) {
      const since = row[seat];
      if (since === null || since === undefined) continue;
      release(riding.get(tram.id)?.[seat], since, now);
      row[seat] = null;
      left -= 1;
    }
  };

  for (let round = 0; round < WARM_UP_CYCLES + 2; round += 1) {
    for (const action of actions) {
      const now = round * cycle + action.time;

      if (action.kind === 'spawn') {
        arrive(action.stop, now);
      } else if (action.kind === 'enter') {
        const row = seats.get(action.tram.id) ?? [];
        for (let seat = 0; seat < Math.min(action.tram.load, row.length); seat += 1) row[seat] = now;
      } else if (action.kind === 'exit') {
        leaveTram(action.tram, action.tram.capacity, now);
      } else if (action.kind === 'alight') {
        const row = seats.get(action.tram.id) ?? [];
        const onBoard = row.filter((seat) => seat !== null).length;
        const count = Math.round(onBoard * action.dwell.alight);
        leaveTram(action.tram, count, now);
        if (hubs.has(action.dwell.stop)) transfers.set(action.dwell, Math.min(count, MAX_TRANSFERS));
      } else if (action.kind === 'transfer') {
        // They come after the tram has taken its passengers, so they wait for the next tram.
        for (let index = 0; index < (transfers.get(action.dwell) ?? 0); index += 1) arrive(action.dwell.stop, now);
        transfers.delete(action.dwell);
      } else {
        const row = seats.get(action.tram.id) ?? [];
        const queue = places.get(action.dwell.stop) ?? [];
        const ready = queue
          .map((since, place) => ({ since, place }))
          .filter((entry): entry is { since: number; place: number } => entry.since !== null)
          .sort((a, b) => b.place - a.place);

        for (const { since, place } of ready) {
          const seat = row.indexOf(null);
          if (seat < 0) break;
          release(waiting.get(action.dwell.stop)?.[place], since, now);
          queue[place] = null;
          row[seat] = now + (SEATED_AFTER - BOARD_AFTER);
        }
      }
    }
  }

  // A passenger who came before the last round and is still at the stop never got a seat:
  // this place is taken for the full cycle.
  for (const [stop, row] of places) {
    row.forEach((since, place) => {
      const log = waiting.get(stop)?.[place];
      if (since !== null && since < recordFrom + cycle && log) log.splice(0, log.length, { from: 0, to: cycle });
    });
  }

  return { waiting, riding };
}

/** True at the moments when a place is taken; used to show the scene as a still picture. */
export function occupied(intervals: readonly Interval[], time: number): boolean {
  return intervals.some(({ from, to }) => (from <= to ? time >= from && time < to : time >= from || time < to));
}

/** Joins intervals that overlap or touch. The result has no interval across the end of the cycle: such a span becomes two. */
export function merge(intervals: readonly Interval[], cycle: number): Interval[] {
  const flat = intervals
    .flatMap(({ from, to }) => (from <= to ? [{ from, to }] : [{ from, to: cycle }, { from: 0, to }]))
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

  const frames: OpacityFrame[] = [{ offset: 0, opacity: visibleAtStart ? 1 : 0 }];
  let level = visibleAtStart ? 1 : 0;
  for (const change of changes) {
    // A change at the very end of the cycle belongs to the start of the next one.
    if (change.opacity === level || change.time >= cycle) continue;
    const start = Math.max(change.time, (frames.at(-1)?.offset ?? 0) * cycle);
    const end = Math.min(start + fade, cycle);
    frames.push({ offset: start / cycle, opacity: level }, { offset: end / cycle, opacity: change.opacity });
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
