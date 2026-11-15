/** /.well-known/ard.json: the catalogue of resources for AI agents (Agentic Resource Discovery). */
import type { APIRoute } from 'astro';

import { ardManifest } from '../../lib/agents.ts';

export const GET: APIRoute = () => Response.json(ardManifest());
