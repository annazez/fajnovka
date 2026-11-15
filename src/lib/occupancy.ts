/**
 * How full the vehicles of DPO are: one reading of the whole network.
 * The server function `api/occupancy.ts` makes a reading from the public feed of DPO. The deck shows it on the first slide.
 */

export interface Occupancy {
  /** True for a reading from the feed of DPO, false for the stored snapshot. */
  live: boolean;
  /** Time of the reading (ISO 8601). */
  time: string;
  /** Vehicles on the road. */
  vehicles: number;
  /** Vehicles that count their passengers. */
  counted: number;
  /** Passengers in the vehicles that count them. */
  passengers: number;
  /** Places to sit and to stand in the vehicles that count their passengers. */
  places: number;
}

const COUNTS = ['vehicles', 'counted', 'passengers', 'places'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** True if a value from the network has the shape of a reading. Never trust a response without this check. */
export function isOccupancy(value: unknown): value is Occupancy {
  return (
    isRecord(value) &&
    typeof value.live === 'boolean' &&
    typeof value.time === 'string' &&
    !Number.isNaN(Date.parse(value.time)) &&
    COUNTS.every((key) => isCount(value[key]))
  );
}

/** Share of the places that passengers take, from 0 to 1. An empty network gives 0. */
export function shareOf({ passengers, places }: Pick<Occupancy, 'passengers' | 'places'>): number {
  return places > 0 ? Math.min(1, passengers / places) : 0;
}

/**
 * Makes a reading from the vehicle list of the DPO dashboard.
 * A vehicle counts only if it has an automatic passenger counter and a known capacity.
 */
export function summarise(payload: unknown, time: Date): Occupancy {
  const list = isRecord(payload) ? payload.data : undefined;
  if (!Array.isArray(list)) throw new Error('The feed has no list of vehicles.');

  let counted = 0;
  let passengers = 0;
  let places = 0;
  for (const item of list) {
    const vehicle: unknown = isRecord(item) ? item.data : undefined;
    const occupancy: unknown = isRecord(vehicle) && vehicle.apc === true ? vehicle.occupancy : undefined;
    if (!isRecord(occupancy)) continue;
    const { inside, technicalCapacity } = occupancy;
    if (!isCount(inside) || !isCount(technicalCapacity) || technicalCapacity === 0) continue;
    counted += 1;
    passengers += inside;
    places += technicalCapacity;
  }
  return { live: true, time: time.toISOString(), vehicles: list.length, counted, passengers, places };
}

/** Limits of the scene: it never becomes empty and never overflows. */
const CALMEST = 0.4;
const BUSIEST = 1.6;

/**
 * How busy the tram scene is for a reading: 1 is as busy as the reference reading.
 * So the trams on the first slide are about as full as the real vehicles.
 */
export function demandOf(reading: Occupancy, reference: Occupancy): number {
  const base = shareOf(reference);
  if (base === 0) return 1;
  return Math.min(BUSIEST, Math.max(CALMEST, shareOf(reading) / base));
}
