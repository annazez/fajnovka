/** /.well-known/ai-catalog.json: the same catalogue in the older form, for tools that do not read ard.json yet. */
import type { APIRoute } from 'astro';

import { aiCatalog } from '../../lib/agents.ts';

export const GET: APIRoute = () => Response.json(aiCatalog());
