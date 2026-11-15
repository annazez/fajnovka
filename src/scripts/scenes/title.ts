/**
 * Tram scene of the title slide. Builds trams and passengers and moves them with the Web Animations API.
 * Only `transform` and `opacity` change, so the browser can run the scene off the main thread.
 */
import {
  CYCLE,
  ENTRY_SECONDS,
  EXIT_SECONDS,
  scene as layouts,
  SEATS_PER_CARRIAGE,
  SPEED,
  type SceneLayout,
  type SceneLine,
  type SceneStop,
} from '../../data/scene.ts';
import {
  coverage,
  distanceAt,
  keyTimes,
  opacityFrames,
  planJourney,
  simulate,
  type Interval,
  type Journey,
  type StopSpec,
  type TramSpec,
  type Waypoint,
} from '../../lib/scene.ts';
import { snapshot } from '../../data/occupancy.ts';
import { demandOf } from '../../lib/occupancy.ts';
import { trace, type Point, type Shape } from '../../lib/path.ts';
import { isFlowLayout } from '../deck/dom.ts';
import { readOccupancy } from '../deck/live.ts';
import { scene } from '../deck/scene.ts';

/** Length of a carriage and the gap to the next one, in tenths of a rem. */
const CAR_LENGTH = 86;
const CAR_GAP = 8;
/** Radius of a stop marker and of the hub marker, with their outlines. */
const STOP_RADIUS = 22.5;
const HUB_RADIUS = 28.5;
/** A tram enters at least this far before its first stop, and at least this far outside the visible screen. */
const GATE_DISTANCE = 500;
const GATE_MARGIN = 160;
const SAMPLES_PER_LEG = 18;
/** A stop marker changes slowly. A passenger changes fast, so a viewer can count the passengers one by one. */
const MARKER_FADE_SECONDS = 0.3;
const PASSENGER_FADE_SECONDS = 0.12;
/** The still picture for people who pause motion: a tram stands at the hub and passengers wait. */
const STILL_AT_SECONDS = 10.4;

/** Design units are tenths of a rem; the scene container sets 1em to 1rem. */
const em = (units: number): string => `${(units / 10).toFixed(3)}em`;

/** Makes an element of the scene. It goes at the end of its parent, or before the node `before`. */
function element(className: string, parent: Element, before: Element | null = null): HTMLElement {
  const node = document.createElement(className === 'seat' ? 'i' : 'div');
  if (className !== 'seat') node.className = className;
  node.dataset.built = '';
  parent.insertBefore(node, before);
  return node;
}

/** Shows an element during the intervals (or hides it during them): it grows in and shrinks out in `fade` seconds. */
function presence(node: HTMLElement, intervals: readonly Interval[], fade: number, hide = false): Animation {
  const frames = opacityFrames(intervals, CYCLE, fade).map(({ offset, opacity }) => {
    const level = hide ? 1 - opacity : opacity;
    return { offset, opacity: level, transform: `scale(${0.4 + 0.6 * level})` };
  });
  return node.animate(frames, { duration: CYCLE * 1000, iterations: Infinity });
}

/** Moves one carriage along the shape of its line. `lead` is its place in the tram: positive is in front of the centre. */
function travel(car: HTMLElement, shape: Shape, journey: Journey, offset: number, lead: number): Animation {
  const frames = keyTimes(journey, CYCLE, SAMPLES_PER_LEG).map((share) => {
    const centre = distanceAt(journey, share * CYCLE);
    const next = distanceAt(journey, Math.min(share * CYCLE + 0.05, CYCLE));
    // The front carriage is ahead in the direction of travel. A tram that stands keeps its last direction.
    const direction = next < centre ? -1 : 1;
    const { x, y, angle } = shape.at(centre + direction * lead);
    return { offset: share, transform: `translate(${em(x)}, ${em(y)}) rotate(${angle.toFixed(2)}deg)` };
  });
  // A negative delay starts the loop in the middle, so the tram is on its way from the first moment.
  return car.animate(frames, { duration: CYCLE * 1000, iterations: Infinity, delay: (offset - CYCLE) * 1000 });
}

/** How far the screen shows the scene to the left and right of the layout, in design units. */
function sideBand(root: HTMLElement, layout: SceneLayout): number {
  const unit = root.getBoundingClientRect().width / layout.width;
  return Math.max(0, (innerWidth / unit - layout.width) / 2);
}

/**
 * The point where a tram enters or leaves the picture: on the end of the line that is nearest to `stop`,
 * outside the visible part of the screen. The ends of both lines are horizontal.
 */
function gate(shape: Shape, end: Point, stop: SceneStop, layout: SceneLayout, band: number): number {
  const side = end.x < stop.x ? -1 : 1;
  const edge = side < 0 ? -band : layout.width + band;
  const reach = Math.max(GATE_DISTANCE, Math.abs(edge - stop.x) + GATE_MARGIN);
  return shape.nearest(stop.x + side * reach, end.y);
}

function waypoints(line: SceneLine, shape: Shape, layout: SceneLayout, band: number): Waypoint[] {
  const visited = line.visits.map((visit) => {
    const stop = layout.stops.find(({ id }) => id === visit.stop);
    if (!stop) throw new Error(`Scene: stop ${visit.stop} is missing`);
    return { visit, stop };
  });
  const first = visited[0];
  const last = visited.at(-1);
  if (!first || !last) throw new Error(`Scene: line ${line.id} has no stops`);

  const stops = visited.map(({ visit, stop }, index): Waypoint => {
    const distance = shape.nearest(stop.x, stop.y);
    // The move to the first stop has a fixed time. The other moves follow from the distance and the speed.
    const fixedTime = index === 0 ? { seconds: ENTRY_SECONDS } : {};
    return { distance, stop: visit.stop, dwell: visit.dwell, alight: visit.alight, ...fixedTime };
  });
  const entry = gate(shape, shape.at(0), first.stop, layout, band);
  const exit = line.returns ? entry : gate(shape, shape.at(shape.length), last.stop, layout, band);
  return [{ distance: entry }, ...stops, { distance: exit, seconds: EXIT_SECONDS }];
}

/** Runs the steps in order, each in its own task of the browser. The page can paint and answer between two steps. */
function inTurns(steps: readonly (() => void)[]): () => void {
  let timer = 0;
  const run = (index: number): void => {
    steps[index]?.();
    if (index + 1 < steps.length) timer = window.setTimeout(run, 0, index + 1);
  };
  run(0);
  return () => {
    clearTimeout(timer);
  };
}

/** One picture of the scene in one layout container. */
interface Picture {
  /** The animations of the picture. The list grows while the picture builds. */
  readonly animations: readonly Animation[];
  /** The moment at which the loop started. */
  readonly origin: CSSNumberish | null;
  /** Stops a build that has not finished. */
  readonly cancel: () => void;
}

/**
 * Builds the scene inside one layout container in three short steps: the plan, the trams, and the stops.
 * A short step does not hold the page. Each part of an older picture stays until its new part is ready.
 * `origin` is the moment at which the loop started. A new picture with the same origin continues without a jump.
 * `settle` gives each new animation its state (it runs, or it shows the still picture) in the task that makes it.
 */
function build(
  root: HTMLElement,
  layout: SceneLayout,
  demand: number,
  origin: CSSNumberish | null,
  settle: (animation: Animation) => void,
): Picture {
  const older = [...root.querySelectorAll('[data-built]')];
  const isTram = (node: Element): boolean => node.matches('.scene__car, .scene__link');
  const animations: Animation[] = [];
  const start = origin ?? document.timeline.currentTime;
  /** All animations share one clock, so the trams and the passengers stay together. */
  const add = (animation: Animation): void => {
    animation.startTime = start;
    settle(animation);
    animations.push(animation);
  };
  /** A seat or a waiting place. A place that no passenger takes stays hidden and needs no animation. */
  const passenger = (parent: Element, intervals: readonly Interval[]): void => {
    const dot = element('seat', parent);
    if (intervals.length > 0) add(presence(dot, intervals, PASSENGER_FADE_SECONDS));
  };

  let trams: { line: SceneLine; shape: Shape; spec: TramSpec; length: number }[] = [];
  let people: ReturnType<typeof simulate> = { waiting: new Map(), riding: new Map() };

  /** Step 1: where each tram is at each moment, and who stands and sits where. */
  const plan = (): void => {
    const band = sideBand(root, layout);
    trams = layout.lines.map((line) => {
      // The shape comes from the same data as the line on the page (see SceneLines.astro).
      const shape = trace(line.d);
      const capacity = line.carriages * SEATS_PER_CARRIAGE;
      const spec: TramSpec = {
        id: line.id,
        capacity,
        load: Math.round(line.load * capacity * demand),
        offset: line.offset,
        journey: planJourney(waypoints(line, shape, layout, band), SPEED),
      };
      return { line, shape, spec, length: line.carriages * CAR_LENGTH + (line.carriages - 1) * CAR_GAP };
    });
    const stops: StopSpec[] = layout.stops.map((stop) => ({
      id: stop.id,
      rate: Math.round(stop.rate * demand),
      hub: stop.hub ?? false,
    }));
    people = simulate(
      CYCLE,
      stops,
      trams.map(({ spec }) => spec),
    );
  };

  /** Step 2: the trams with their passengers. */
  const drawTrams = (): void => {
    for (const node of older.filter(isTram)) node.remove();
    // Carriage 0 is the front one. The centre of the tram stops exactly on the stop.
    const leadOf = (line: SceneLine, index: number): number =>
      ((line.carriages - 1) / 2 - index) * (CAR_LENGTH + CAR_GAP);

    // Each carriage has a ring in the colour of the slide. A link joins the rings of two carriages into one shape.
    // The links lie below all carriages.
    for (const { line, shape, spec } of trams) {
      for (let index = 1; index < line.carriages; index += 1) {
        const link = element('scene__link', root);
        add(travel(link, shape, spec.journey, spec.offset, leadOf(line, index - 0.5)));
        link.classList.add('is-ready');
      }
    }

    for (const { line, shape, spec } of trams) {
      const seats = people.riding.get(spec.id) ?? [];
      for (let index = 0; index < line.carriages; index += 1) {
        const car = element('scene__car', root);
        car.dataset.line = line.id;
        car.dataset.tone = line.tone;
        add(travel(car, shape, spec.journey, spec.offset, leadOf(line, index)));
        for (const intervals of seats.slice(index * SEATS_PER_CARRIAGE, (index + 1) * SEATS_PER_CARRIAGE)) {
          passenger(car, intervals);
        }
        car.classList.add('is-ready');
      }
    }
  };

  /** Step 3: the stops with the passengers who wait. The stops lie below the trams. */
  const drawStops = (): void => {
    for (const node of older.filter((item) => !isTram(item))) node.remove();
    const firstTram = root.querySelector('.scene__link, .scene__car');

    for (const stop of layout.stops) {
      // A stop marker leaves while a tram stands on it, so the two never overlap.
      const radius = stop.hub ? HUB_RADIUS : STOP_RADIUS;
      const marker = element(stop.hub ? 'scene__stop is-hub' : 'scene__stop', root, firstTram);
      marker.style.left = em(stop.x);
      marker.style.top = em(stop.y);
      const covered = trams
        .filter(({ line }) => line.visits.some((visit) => visit.stop === stop.id))
        .flatMap(({ shape, spec, length }) =>
          coverage(spec.journey, spec.offset, CYCLE, shape.nearest(stop.x, stop.y), length / 2 + radius),
        );
      add(presence(marker, covered, MARKER_FADE_SECONDS, true));

      const group = element('scene__wait', root, firstTram);
      group.style.left = em(stop.x + stop.wait[0]);
      group.style.top = em(stop.y + stop.wait[1]);
      for (const intervals of people.waiting.get(stop.id) ?? []) passenger(group, intervals);
    }

    root.classList.add('is-built');
    // For tests and for the curious: how busy this picture is.
    root.dataset.demand = demand.toFixed(2);
  };

  return { animations, origin: start, cancel: inTurns([plan, drawTrams, drawStops]) };
}

scene('title', (context) => {
  const deck = context.slide.closest<HTMLElement>('[data-deck]');
  let picture: Picture | undefined;
  let built: string | null = null;
  // The trams are as full as the real vehicles: the reading sets how busy the scene is.
  let reading = snapshot;
  let asked = false;

  /** An animation runs while the slide is visible and motion is on. Without motion, it shows the still picture. */
  const settle = (animation: Animation): void => {
    if (context.running && context.active) {
      animation.play();
    } else {
      animation.pause();
      if (!context.running) animation.currentTime = STILL_AT_SECONDS * 1000;
    }
  };
  const apply = (): void => {
    picture?.animations.forEach(settle);
  };

  const refresh = (force = false): void => {
    const name = isFlowLayout() ? 'flow' : 'stage';
    const root = context.slide.querySelector<HTMLElement>(`[data-scene="${name}"]`);
    if (!root || (built === name && !force)) return;

    picture?.cancel();
    // A new picture of the same layout continues the loop of the old one. The picture of the other layout stops.
    const origin = built === name ? (picture?.origin ?? null) : null;
    if (built !== name) for (const animation of picture?.animations ?? []) animation.cancel();
    picture = build(root, layouts[name], demandOf(reading, snapshot), origin, settle);
    built = name;
  };

  /** Asks for the live reading one time. The stored snapshot stays if no answer comes. */
  const ask = (): void => {
    if (asked) return;
    asked = true;
    void readOccupancy(deck?.dataset.live).then((answer) => {
      if (answer === reading) return;
      reading = answer;
      refresh(true);
    });
  };

  addEventListener('resize', () => {
    if (context.active) refresh();
  });

  return {
    enter() {
      refresh();
      apply();
      ask();
    },
    leave: apply,
    motion: apply,
  };
});
