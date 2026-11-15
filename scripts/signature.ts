/**
 * The signature of the manual page: one hash of its text and of the shapes in its charts.
 * The PDF script stores the signature of the page that it printed. A test compares it with the page of today,
 * so nobody can change the manual and forget the PDF.
 */
import { createHash } from 'node:crypto';

import type { Page } from '@playwright/test';

export async function manualSignature(page: Page): Promise<string> {
  const content = await page.locator('main').evaluate((main) => {
    const copy = main.cloneNode(true) as HTMLElement;
    // The page numbers in the contents exist only in the PDF.
    for (const number of copy.querySelectorAll('[data-page-of]')) number.textContent = '';
    const text = (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
    const shapes = [...copy.querySelectorAll('.chart path')].map((path) => path.getAttribute('d')).join('|');
    return `${text}\n${shapes}`;
  });
  return createHash('sha256').update(content).digest('hex');
}
