/**
 * Server function (Vercel, region fra1): one reading of how full the vehicles of DPO are.
 *
 * GET /api/occupancy gives a small JSON object (see `Occupancy`). It has no parameters and it reads nothing from the request.
 * The function asks the public dashboard of DPO for its vehicle list and keeps only four sums.
 * The CDN keeps each answer for one minute, so the dashboard gets one request a minute at most.
 * If the dashboard does not answer, the function gives the stored snapshot, marked `live: false`.
 */
import { snapshot } from '../src/data/occupancy.ts';
import { summarise, type Occupancy } from '../src/lib/occupancy.ts';

const FEED = 'https://dashboard.dpo.cz/api/server';
const QUERY = { endpoint: 'transport/vehicle/list?page=dashboard&withTripId=1&vehicleStates=ride', apiMethod: 'GET', data: {}, host: null };
const TIMEOUT = 5000;

async function read(): Promise<Occupancy> {
  const response = await fetch(FEED, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'fajnovka (https://github.com/annazez/fajnovka)' },
    body: JSON.stringify(QUERY),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`The feed answered ${response.status}.`);
  return summarise(await response.json(), new Date());
}

export default {
  async fetch(): Promise<Response> {
    const reading = await read().catch(() => snapshot);
    return Response.json(reading, {
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
