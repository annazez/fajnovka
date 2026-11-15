/** /llms.txt: the guide to the site for language models. */
import type { APIRoute } from 'astro';

import { loadChapters } from '../data/chapters.ts';
import { llmsText } from '../lib/agents.ts';

export const GET: APIRoute = async () =>
  new Response(llmsText(await loadChapters('en')), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
