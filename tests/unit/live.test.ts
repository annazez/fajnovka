import { afterEach, describe, expect, test, vi } from 'vitest';

import { snapshot } from '../../src/data/occupancy.ts';
import type { Occupancy } from '../../src/lib/occupancy.ts';
import { readOccupancy } from '../../src/scripts/deck/live.ts';

const live: Occupancy = { live: true, time: '2026-11-15T13:07:00.000Z', vehicles: 1102, counted: 98, passengers: 1698, places: 12_286 };

describe('reading from the server function', () => {
  afterEach(() => vi.unstubAllGlobals());

  const answer = (response: () => Promise<Response>) => {
    const fetch = vi.fn(response);
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  test('a host without the function makes no request', async () => {
    const fetch = answer(() => Promise.resolve(Response.json(live)));
    expect(await readOccupancy(undefined)).toBe(snapshot);
    expect(await readOccupancy('')).toBe(snapshot);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('a good answer is the reading', async () => {
    const fetch = answer(() => Promise.resolve(Response.json(live)));
    expect(await readOccupancy('/api/occupancy')).toEqual(live);
    expect(fetch).toHaveBeenCalledWith('/api/occupancy', { signal: expect.any(AbortSignal) as AbortSignal });
  });

  test.each([
    ['an error status', () => Promise.resolve(Response.json(live, { status: 500 }))],
    ['a wrong shape', () => Promise.resolve(Response.json({ ...live, places: 'many' }))],
    ['a page that is not JSON', () => Promise.resolve(new Response('<html>'))],
    ['a network error', () => Promise.reject(new TypeError('offline'))],
  ])('%s gives the stored snapshot', async (_, response) => {
    answer(response);
    expect(await readOccupancy('/api/occupancy')).toBe(snapshot);
  });
});
