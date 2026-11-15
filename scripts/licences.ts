/**
 * Checks the licence of each package in package-lock.json.
 * The check fails if a package has no licence, or a licence that this project does not accept.
 *
 * Use: `node scripts/licences.ts`
 */
import { readFileSync } from 'node:fs';

/** Licences that the project does not accept, each with the reason. */
export const DENIED: readonly (readonly [pattern: RegExp, reason: string])[] = [
  [/\bAGPL/i, 'it puts its conditions on a site that people use through a network'],
  [/(?<![A-Z])GPL/i, 'it puts its conditions on the full program (the LGPL is accepted)'],
  [/\bSSPL/i, 'it is not an open-source licence'],
  [/\b(BUSL|BSL-1\.1)/i, 'it is not an open-source licence'],
  [/\bCC-BY-NC/i, 'it does not permit commercial use'],
  [/Commons-Clause/i, 'it does not permit commercial use'],
  [/\bUNLICEN[CS]ED\b/i, 'the package gives no permission to use it'],
  [/\bSEE LICEN[CS]E IN\b/i, 'the licence is not a standard licence, so a person must read it first'],
];

/**
 * The reason why a licence is not accepted. A good licence gives nothing.
 * `MIT OR GPL-3.0` is good: the project takes the alternative that it accepts.
 */
export function licenceProblem(licence: string | undefined): string | undefined {
  if (licence === undefined || licence.trim() === '') return 'the package names no licence';
  const reasons = licence
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .map((alternative) => DENIED.find(([pattern]) => pattern.test(alternative))?.[1]);
  return reasons.includes(undefined) ? undefined : reasons[0];
}

interface Lock {
  packages: Record<string, { license?: string }>;
}

/** The packages of a lock file that have a licence problem, as lines of text. */
export function problems(lock: Lock): string[] {
  return Object.entries(lock.packages)
    .filter(([path]) => path !== '')
    .flatMap(([path, { license }]) => {
      const reason = licenceProblem(license);
      const name = path.replace(/^.*node_modules\//, '');
      return reason === undefined ? [] : [`${name} (${license ?? 'no licence'}): ${reason}`];
    });
}

if (import.meta.main) {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as Lock;
  const found = problems(lock);
  for (const line of found) console.error(line);
  const total = Object.keys(lock.packages).length - 1;
  console.log(`Licences: ${total} packages, ${found.length === 1 ? '1 problem' : `${found.length} problems`}.`);
  process.exitCode = found.length === 0 ? 0 : 1;
}
