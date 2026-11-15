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

/** Distance along a path that is nearest to a point. */
function distanceTo(path: SVGPathElement, x: number, y: number): number {
  const total = path.getTotalLength();
  let best = 0;
  let bestGap = Infinity;
  for (let distance = 0; distance <= total; distance += 2) {
    const point = path.getPointAtLength(distance);
    const gap = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (gap < bestGap) {
      bestGap = gap;
      best = distance;
    }
  }
  return best;
}

function element(className: string, parent: Element): HTMLElement {
  const node = document.createElement(className === 'seat' ? 'i' : 'div');
  if (className !== 'seat') node.className = className;
  node.dataset.built = '';
  parent.append(node);
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

/** Moves one carriage along the path of its line. `lead` is its place in the tram: positive is in front of the centre. */
function travel(car: HTMLElement, path: SVGPathElement, journey: Journey, offset: number, lead: number): Animation {
  const total = path.getTotalLength();
  const frames = keyTimes(journey, CYCLE, SAMPLES_PER_LEG).map((share) => {
    const centre = distanceAt(journey, share * CYCLE);
    const next = distanceAt(journey, Math.min(share * CYCLE + 0.05, CYCLE));
    // The front carriage is ahead in the direction of travel. A tram that stands keeps its last direction.
    const direction = next < centre ? -1 : 1;
    const distance = Math.min(Math.max(centre + direction * lead, 0), total);
    const point = path.getPointAtLength(distance);
    const ahead = path.getPointAtLength(Math.min(distance + 1, total));
    const behind = path.getPointAtLength(Math.max(distance - 1, 0));
    const angle = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
    return { offset: share, transform: `translate(${em(point.x)}, ${em(point.y)}) rotate(${angle.toFixed(2)}deg)` };
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
function gate(path: SVGPathElement, end: DOMPoint, stop: SceneStop, layout: SceneLayout, band: number): number {
  const side = end.x < stop.x ? -1 : 1;
  const edge = side < 0 ? -band : layout.width + band;
  const reach = Math.max(GATE_DISTANCE, Math.abs(edge - stop.x) + GATE_MARGIN);
  return distanceTo(path, stop.x + side * reach, end.y);
}

function waypoints(line: SceneLine, path: SVGPathElement, layout: SceneLayout, band: number): Waypoint[] {
  const visited = line.visits.map((visit) => {
    const stop = layout.stops.find(({ id }) => id === visit.stop);
    if (!stop) throw new Error(`Scene: stop ${visit.stop} is missing`);
    return { visit, stop };
  });
  const first = visited[0];
  const last = visited.at(-1);
  if (!first || !last) throw new Error(`Scene: line ${line.id} has no stops`);

  const stops = visited.map(({ visit, stop }, index): Waypoint => {
    const distance = distanceTo(path, stop.x, stop.y);
    // The move to the first stop has a fixed time. The other moves follow from the distance and the speed.
    const fixedTime = index === 0 ? { seconds: ENTRY_SECONDS } : {};
    return { distance, stop: visit.stop, dwell: visit.dwell, alight: visit.alight, ...fixedTime };
  });
  const entry = gate(path, path.getPointAtLength(0), first.stop, layout, band);
  const exit = line.returns ? entry : gate(path, path.getPointAtLength(path.getTotalLength()), last.stop, layout, band);
  return [{ distance: entry }, ...stops, { distance: exit, seconds: EXIT_SECONDS }];
}

/**
 * Builds the scene inside one layout container and returns its animations.
 * `origin` is the moment at which the loop started. A new picture with the same origin continues without a jump.
 */
function build(root: HTMLElement, layout: SceneLayout, demand: number, origin: CSSNumberish | null): Animation[] {
  root.querySelectorAll('[data-built]').forEach((node) => node.remove());
  const band = sideBand(root, layout);

  const trams = layout.lines.map((line) => {
    const path = root.querySelector<SVGPathElement>(`[data-line="${line.id}"]`);
    if (!path) throw new Error(`Scene: line ${line.id} is missing`);
    const capacity = line.carriages * SEATS_PER_CARRIAGE;
    const spec: TramSpec = {
      id: line.id,
      capacity,
      load: Math.round(line.load * capacity * demand),
      offset: line.offset,
      journey: planJourney(waypoints(line, path, layout, band), SPEED),
    };
    return { line, path, spec, length: line.carriages * CAR_LENGTH + (line.carriages - 1) * CAR_GAP };
  });

  const stops: StopSpec[] = layout.stops.map((stop) => ({
    id: stop.id,
    rate: Math.round(stop.rate * demand),
    hub: stop.hub ?? false,
  }));
  const { waiting, riding } = simulate(
    CYCLE,
    stops,
    trams.map(({ spec }) => spec),
  );
  const animations: Animation[] = [];

  for (const stop of layout.stops) {
    // A stop marker leaves while a tram stands on it, so the two never overlap.
    const radius = stop.hub ? HUB_RADIUS : STOP_RADIUS;
    const marker = element(stop.hub ? 'scene__stop is-hub' : 'scene__stop', root);
    marker.style.left = em(stop.x);
    marker.style.top = em(stop.y);
    const covered = trams
      .filter(({ line }) => line.visits.some((visit) => visit.stop === stop.id))
      .flatMap(({ path, spec, length }) =>
        coverage(spec.journey, spec.offset, CYCLE, distanceTo(path, stop.x, stop.y), length / 2 + radius),
      );
    animations.push(presence(marker, covered, MARKER_FADE_SECONDS, true));

    const group = element('scene__wait', root);
    group.style.left = em(stop.x + stop.wait[0]);
    group.style.top = em(stop.y + stop.wait[1]);
    for (const intervals of waiting.get(stop.id) ?? [])
      animations.push(presence(element('seat', group), intervals, PASSENGER_FADE_SECONDS));
  }

  // Carriage 0 is the front one. The centre of the tram stops exactly on the stop.
  const leadOf = (line: SceneLine, index: number): number =>
    ((line.carriages - 1) / 2 - index) * (CAR_LENGTH + CAR_GAP);

  // Each carriage has a ring in the colour of the slide. A link joins the rings of two carriages into one shape.
  // The links lie below all carriages.
  for (const { line, path, spec } of trams) {
    for (let index = 1; index < line.carriages; index += 1) {
      const link = element('scene__link', root);
      animations.push(travel(link, path, spec.journey, spec.offset, leadOf(line, index - 0.5)));
      link.classList.add('is-ready');
    }
  }

  for (const { line, path, spec } of trams) {
    const seats = riding.get(spec.id) ?? [];
    for (let index = 0; index < line.carriages; index += 1) {
      const car = element('scene__car', root);
      car.dataset.line = line.id;
      car.dataset.tone = line.tone;
      animations.push(travel(car, path, spec.journey, spec.offset, leadOf(line, index)));
      for (const intervals of seats.slice(index * SEATS_PER_CARRIAGE, (index + 1) * SEATS_PER_CARRIAGE)) {
        animations.push(presence(element('seat', car), intervals, PASSENGER_FADE_SECONDS));
      }
      car.classList.add('is-ready');
    }
  }

  const start = origin ?? document.timeline.currentTime;
  for (const animation of animations) animation.startTime = start;
  root.classList.add('is-built');
  // For tests and for the curious: how busy this picture is.
  root.dataset.demand = demand.toFixed(2);
  return animations;
}

scene('title', (context) => {
  const deck = context.slide.closest<HTMLElement>('[data-deck]');
  let animations: Animation[] = [];
  let built: string | null = null;
  let origin: CSSNumberish | null = null;
  // The trams are as full as the real vehicles: the reading sets how busy the scene is.
  let reading = snapshot;
  let asked = false;

  const apply = (): void => {
    for (const animation of animations) {
      if (context.running && context.active) {
        animation.play();
      } else {
        animation.pause();
        if (!context.running) animation.currentTime = STILL_AT_SECONDS * 1000;
      }
    }
  };

  const refresh = (force = false): void => {
    const name = isFlowLayout() ? 'flow' : 'stage';
    const root = context.slide.querySelector<HTMLElement>(`[data-scene="${name}"]`);
    if (!root || (built === name && !force)) return;
    const start = built === name ? origin : null;
    for (const animation of animations) animation.cancel();
    animations = build(root, layouts[name], demandOf(reading, snapshot), start);
    origin = animations[0]?.startTime ?? null;
    built = name;
    apply();
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
