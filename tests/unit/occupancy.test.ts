import { afterEach, describe, expect, test, vi } from 'vitest';

import occupancy from '../../api/occupancy.ts';
import { numbers } from '../../src/data/numbers.ts';
import { snapshot } from '../../src/data/occupancy.ts';
import { demandOf, isOccupancy, shareOf, summarise, type Occupancy } from '../../src/lib/occupancy.ts';

const vehicle = (inside: unknown, technicalCapacity: unknown, apc: unknown = true) => ({ data: { apc, occupancy: { inside, technicalCapacity } } });
const reading = (passengers: number, places: number): Occupancy => ({ ...snapshot, live: true, passengers, places });
const NOW = new Date('2026-11-15T13:07:00Z');

describe('reading of the network', () => {
  test('the stored snapshot gives the number on the second slide', () => {
    expect(isOccupancy(snapshot)).toBe(true);
    expect(Math.round(shareOf(snapshot) * 100)).toBe(numbers.peakOccupancy.value);
  });

  test('a summary adds the vehicles that count their passengers', () => {
    const payload = { status: 'ok', data: [vehicle(35, 119), vehicle(5, 80), vehicle(9, 90, false), { data: { apc: true } }, vehicle(-1, 90), vehicle(3, 0), vehicle('3', 90), null] };
    expect(summarise(payload, NOW)).toEqual({ live: true, time: '2026-11-15T13:07:00.000Z', vehicles: 8, counted: 2, passengers: 40, places: 199 });
  });

  test('an empty list is a valid reading of a network at night', () => {
    const empty = summarise({ data: [] }, NOW);
    expect(empty).toMatchObject({ vehicles: 0, counted: 0, passengers: 0, places: 0 });
    expect(shareOf(empty)).toBe(0);
  });

  test.each([null, 'text', {}, { data: 'none' }])('a payload without a list of vehicles is an error: %j', (payload) => {
    expect(() => summarise(payload, NOW)).toThrow('no list of vehicles');
  });

  test('the share is never more than the whole', () => {
    expect(shareOf({ passengers: 30, places: 120 })).toBe(0.25);
    expect(shareOf({ passengers: 150, places: 120 })).toBe(1);
  });

  test.each([
    [{ ...snapshot, live: 'yes' }],
    [{ ...snapshot, time: 'tomorrow' }],
    [{ ...snapshot, vehicles: -1 }],
    [{ ...snapshot, places: 1.5 }],
    [{ ...snapshot, passengers: undefined }],
    [null],
    ['{}'],
  ])('a response with a wrong shape is not a reading: %j', (value) => {
    expect(isOccupancy(value)).toBe(false);
  });
});

describe('how busy the scene is', () => {
  test('the reference reading gives the usual scene', () => {
    expect(demandOf(snapshot, snapshot)).toBe(1);
  });

  test('a fuller network gives a busier scene, inside the limits', () => {
    expect(demandOf(reading(150, 1000), reading(100, 1000))).toBeCloseTo(1.5);
    expect(demandOf(reading(900, 1000), reading(100, 1000))).toBe(1.6);
    expect(demandOf(reading(0, 0), reading(100, 1000))).toBe(0.4);
  });

  test('an empty reference changes nothing', () => {
    expect(demandOf(reading(10, 100), reading(0, 0))).toBe(1);
  });
});

describe('GET /api/occupancy', () => {
  afterEach(() => vi.unstubAllGlobals());

  const call = async (answer: () => Promise<Response>) => {
    const feed = vi.fn(answer);
    vi.stubGlobal('fetch', feed);
    const response = await occupancy.fetch();
    return { feed, response, body: (await response.json()) as unknown };
  };

  test('a good answer of the feed gives a live reading that the CDN keeps for a minute', async () => {
    const { feed, response, body } = await call(() => Promise.resolve(Response.json({ data: [vehicle(35, 119)] })));
    expect(body).toMatchObject({ live: true, vehicles: 1, counted: 1, passengers: 35, places: 119 });
    expect(isOccupancy(body)).toBe(true);
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');

    const [address, request] = feed.mock.calls[0] as unknown as [string, RequestInit];
    expect(address).toBe('https://dashboard.dpo.cz/api/server');
    expect(request.method).toBe('POST');
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });

  test.each([
    ['an error status', () => Promise.resolve(new Response('no', { status: 503 }))],
    ['a network error', () => Promise.reject(new Error('offline'))],
    ['a page that is not JSON', () => Promise.resolve(new Response('<html>'))],
    ['a JSON without vehicles', () => Promise.resolve(Response.json({ status: 'error' }))],
  ])('%s gives the stored snapshot', async (_, answer) => {
    const { response, body } = await call(answer);
    expect(response.status).toBe(200);
    expect(body).toEqual(snapshot);
  });
});
