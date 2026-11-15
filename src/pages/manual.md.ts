/** /manual.md: the English manual as one Markdown text. */
import type { APIRoute } from 'astro';

import { loadChapters } from '../data/chapters.ts';
import { manualText } from '../lib/agents.ts';

export const GET: APIRoute = async () => new Response(manualText('en', await loadChapters('en')), { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
