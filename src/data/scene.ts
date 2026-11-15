/**
 * The tram scene of the title slide: two lines that meet at one hub.
 * Coordinates are in tenths of a rem (1920 × 1080 for the stage layout). The page draws the lines and stops
 * from this file, and the script moves trams and passengers along them.
 */

export interface SceneStop {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Two lines meet here. */
  readonly hub?: boolean;
  /** Centre of the waiting passengers, relative to the stop. */
  readonly wait: readonly [number, number];
  /** Passengers who arrive in one cycle when the network is busy. */
  readonly rate: number;
}

export interface SceneVisit {
  readonly stop: string;
  /** Seconds at the stop. */
  readonly dwell: number;
  /** Share of the passengers who leave the tram here. */
  readonly alight: number;
}

export interface SceneLine {
  readonly id: string;
  /** light: a light line with dark trams. dark: a dark line with light trams. */
  readonly tone: 'light' | 'dark';
  /** SVG path. It starts and ends far outside the picture, so a very wide screen does not show its ends. */
  readonly d: string;
  readonly carriages: 1 | 2;
  /** Share of the seats that are taken when the tram enters. */
  readonly load: number;
  /** Start of the trip inside the cycle, in seconds. */
  readonly offset: number;
  /** A tram of a line with a terminus goes back the way it came. */
  readonly returns: boolean;
  readonly visits: readonly SceneVisit[];
}

export interface SceneLayout {
  readonly width: number;
  readonly height: number;
  readonly lines: readonly SceneLine[];
  readonly stops: readonly SceneStop[];
}

/** Seconds of one loop. The offsets of the lines keep the two trams away from the hub at the same time. */
export const CYCLE = 24;
/** Tenths of a rem in one second. */
export const SPEED = 200;
/** Seconds that a tram needs from the edge of the picture to its first stop, and from its last stop to the edge. */
export const ENTRY_SECONDS = 2.6;
export const EXIT_SECONDS = 2.4;
export const SEATS_PER_CARRIAGE = 4;

const through: readonly SceneVisit[] = [
  { stop: 'first', dwell: 2.4, alight: 0.25 },
  { stop: 'hub', dwell: 2.4, alight: 0.5 },
  { stop: 'last', dwell: 2.4, alight: 0.34 },
];

const branch: readonly SceneVisit[] = [
  { stop: 'side', dwell: 1.8, alight: 0.25 },
  { stop: 'hub', dwell: 1.8, alight: 0.5 },
  { stop: 'end', dwell: 2.6, alight: 1 },
  { stop: 'hub', dwell: 1.8, alight: 0.5 },
  { stop: 'side', dwell: 1.8, alight: 0.25 },
];

const lines = (through_d: string, branch_d: string): readonly SceneLine[] => [
  { id: 'through', tone: 'light', d: through_d, carriages: 2, load: 0.25, offset: 0, returns: false, visits: through },
  { id: 'branch', tone: 'dark', d: branch_d, carriages: 1, load: 0.5, offset: 8, returns: true, visits: branch },
];

export const scene: Record<'stage' | 'flow', SceneLayout> = {
  stage: {
    width: 1920,
    height: 1080,
    lines: lines('M-1400 880H560q80 0 136-56t136-56H3320', 'M3320 600H1358Q1318 600 1289.7 628.3L1038 880'),
    stops: [
      { id: 'first', x: 330, y: 880, wait: [0, -54], rate: 5 },
      { id: 'hub', x: 1150, y: 768, hub: true, wait: [-52, -52], rate: 2 },
      { id: 'last', x: 1650, y: 768, wait: [0, -54], rate: 2 },
      { id: 'side', x: 1650, y: 600, wait: [0, -54], rate: 1 },
      { id: 'end', x: 1038, y: 880, wait: [-56, -40], rate: 3 },
    ],
  },
  flow: {
    width: 1080,
    height: 520,
    lines: lines('M-1400 400H250q80 0 136-56t136-56H2480', 'M2480 120H898Q858 120 829.7 148.3L578 400'),
    stops: [
      { id: 'first', x: 140, y: 400, wait: [0, -54], rate: 5 },
      { id: 'hub', x: 690, y: 288, hub: true, wait: [-52, -52], rate: 2 },
      { id: 'last', x: 950, y: 288, wait: [0, -54], rate: 2 },
      { id: 'side', x: 990, y: 120, wait: [0, -54], rate: 1 },
      { id: 'end', x: 578, y: 400, wait: [-56, -40], rate: 3 },
    ],
  },
};
