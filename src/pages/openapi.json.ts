/** /openapi.json: the description of the server function with the live data. */
import type { APIRoute } from 'astro';

import { openApi } from '../lib/agents.ts';

export const GET: APIRoute = () => Response.json(openApi());
