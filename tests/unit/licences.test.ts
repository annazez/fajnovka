import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { licenceProblem, problems } from '../../scripts/licences.ts';

describe('licences of the packages', () => {
  test.each([
    'MIT',
    'ISC',
    'Apache-2.0',
    'BSD-3-Clause',
    'MPL-2.0',
    'LGPL-3.0-or-later',
    'Apache-2.0 AND LGPL-3.0-or-later',
    'OFL-1.1',
    'EUPL-1.2',
  ])('%s is accepted', (licence) => {
    expect(licenceProblem(licence)).toBeUndefined();
  });

  test.each([
    ['AGPL-3.0-only', 'through a network'],
    ['GPL-3.0-or-later', 'the full program'],
    ['GPL-2.0', 'the full program'],
    ['MIT AND GPL-3.0-only', 'the full program'],
    ['SSPL-1.0', 'not an open-source licence'],
    ['BUSL-1.1', 'not an open-source licence'],
    ['CC-BY-NC-4.0', 'commercial use'],
    ['MIT AND Commons-Clause', 'commercial use'],
    ['UNLICENSED', 'no permission'],
    ['SEE LICENSE IN LICENSE.txt', 'a person must read it'],
  ])('%s is not accepted', (licence, reason) => {
    expect(licenceProblem(licence)).toContain(reason);
  });

  test('a package without a licence is not accepted', () => {
    expect(licenceProblem(undefined)).toBe('the package names no licence');
    expect(licenceProblem(' ')).toBe('the package names no licence');
  });

  test('a choice of licences is accepted if one of them is', () => {
    expect(licenceProblem('(MIT OR GPL-3.0-only)')).toBeUndefined();
    expect(licenceProblem('GPL-2.0 OR AGPL-3.0')).toContain('the full program');
  });

  test('the report names the package, its licence and the reason', () => {
    const lock = {
      packages: {
        '': {},
        'node_modules/good': { license: 'MIT' },
        'node_modules/a/node_modules/@scope/bad': { license: 'AGPL-3.0' },
        'node_modules/none': {},
      },
    };
    expect(problems(lock)).toEqual([
      '@scope/bad (AGPL-3.0): it puts its conditions on a site that people use through a network',
      'none (no licence): the package names no licence',
    ]);
  });

  test('each package of this project has an accepted licence', () => {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as Parameters<typeof problems>[0];
    expect(Object.keys(lock.packages).length).toBeGreaterThan(100);
    expect(problems(lock)).toEqual([]);
  });
});
