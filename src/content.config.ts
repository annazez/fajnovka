/**
 * Content collections.
 * manual: the chapters of the manual, one Markdown file for each chapter and language:
 *         `src/content/manual/<language>/<order>-<name>.md`.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const collections = {
  manual: defineCollection({
    loader: glob({ pattern: '*/*.md', base: './src/content/manual' }),
    schema: z.object({
      /** Title of the chapter. */
      title: z.string().min(1),
      /** Place of the chapter in the manual, from 1. */
      order: z.number().int().positive(),
    }),
  }),
};
