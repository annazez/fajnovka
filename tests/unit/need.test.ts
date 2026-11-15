import { describe, expect, test } from 'vitest';

import { need } from '../../src/lib/need.ts';
import { hasPublicFile } from '../../src/lib/site.ts';

describe('need', () => {
  test('a value that exists comes back, also when it is zero, empty or null', () => {
    expect(need('text', 'A text')).toBe('text');
    expect(need(0, 'A number')).toBe(0);
    expect(need('', 'A text')).toBe('');
    expect(need(null, 'A value')).toBeNull();
  });

  test('a missing value is an error that names the value', () => {
    expect(() => need(undefined, 'The year 2030 of the model')).toThrow('The year 2030 of the model is missing.');
  });
});

describe('files in the public folder', () => {
  test('a file that the site serves is found by its address', () => {
    expect(hasPublicFile('/favicon.svg')).toBe(true);
    expect(hasPublicFile('/manual/fajnovka-manual-en.pdf')).toBe(true);
  });

  test('an address without a file is not found', () => {
    expect(hasPublicFile('/manual/fajnovka-manual-de.pdf')).toBe(false);
  });
});
