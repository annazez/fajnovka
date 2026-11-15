/** Helpers that read the project files when the site is built. Do not import this file in a browser script. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** True if `public` holds a file with this address, for example `/manual/fajnovka-manual-en.pdf`. */
export function hasPublicFile(address: string): boolean {
  return existsSync(join(process.cwd(), 'public', address));
}
