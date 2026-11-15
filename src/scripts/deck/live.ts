/**
 * The reading of the DPO network for the first slide.
 * The page asks its own server function, never a third party. If there is no function or no good answer, the stored snapshot stays.
 */
import { snapshot } from '../../data/occupancy.ts';
import { isOccupancy, type Occupancy } from '../../lib/occupancy.ts';

const TIMEOUT = 4000;

/** `address` is the path of the server function. It is empty on a host that has no function. */
export async function readOccupancy(address: string | undefined): Promise<Occupancy> {
  if (!address) return snapshot;
  try {
    const response = await fetch(address, { signal: AbortSignal.timeout(TIMEOUT) });
    const value: unknown = response.ok ? await response.json() : null;
    return isOccupancy(value) ? value : snapshot;
  } catch {
    return snapshot;
  }
}
