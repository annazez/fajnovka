/** /cs/manual.md: the Czech manual as one Markdown text. */
import type { APIRoute } from 'astro';

import { loadChapters } from '../../data/chapters.ts';
import { manualText } from '../../lib/agents.ts';

export const GET: APIRoute = async () =>
  new Response(manualText('cs', await loadChapters('cs')), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
