/**
 * The stored reading of the DPO network: Friday 13 November 2026, 16:38, the afternoon rush hour.
 * It is the source of the "12 % of capacity" on the second slide, the reference for the tram scene,
 * and the reading that the first slide shows when the live feed is not available.
 */
import type { Occupancy } from '../lib/occupancy.ts';

export const snapshot: Occupancy = {
  live: false,
  time: '2026-11-13T15:38:00.000Z',
  vehicles: 224,
  counted: 204,
  passengers: 2908,
  places: 24_758,
};
