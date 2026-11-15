import { describe, expect, test } from 'vitest';

import config from '../../vercel.json' with { type: 'json' };

/** The headers that the host sends with each answer. */
const sent = new Map(
  config.headers
    .filter(({ source }) => source === '/(.*)')
    .flatMap(({ headers }) => headers)
    .map(({ key, value }) => [key.toLowerCase(), value]),
);
const directives = (value = ''): string[] => value.split(';').map((directive) => directive.trim());

describe('the headers of the site (vercel.json)', () => {
  test('search engines do not list the site', () => {
    expect(sent.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  test('no other site can show a page in a frame, change its base address or receive a form', () => {
    expect(directives(sent.get('content-security-policy')).toSorted()).toEqual([
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ]);
    expect(sent.get('x-frame-options')).toBe('DENY');
  });

  test('the policy in the header does not limit scripts and styles: each page does that with hashes', () => {
    expect(sent.get('content-security-policy')).not.toMatch(/default-src|script-src|style-src/);
  });

  test('the browser uses HTTPS for two years', () => {
    const [age, ...rest] = directives(sent.get('strict-transport-security'));
    expect(Number(age?.replace('max-age=', ''))).toBeGreaterThanOrEqual(2 * 365 * 24 * 60 * 60);
    expect(rest).toContain('includeSubDomains');
  });

  test('the browser does not guess a content type and sends no referrer', () => {
    expect(sent.get('x-content-type-options')).toBe('nosniff');
    expect(sent.get('referrer-policy')).toBe('no-referrer');
  });

  test('a page shares its process and its files with no other site', () => {
    expect(sent.get('cross-origin-opener-policy')).toBe('same-origin');
    expect(sent.get('cross-origin-resource-policy')).toBe('same-origin');
  });

  test('a page gets no sensor, camera, microphone, position, payment or USB device', () => {
    const features = (sent.get('permissions-policy') ?? '').split(',').map((feature) => feature.trim());
    expect(features.length).toBeGreaterThanOrEqual(8);
    for (const feature of features) expect(feature).toMatch(/^[a-z-]+=\(\)$/);
    // The deck needs the full screen and the wake lock. Tools for AI agents must stay possible.
    expect(sent.get('permissions-policy')).not.toMatch(/fullscreen|screen-wake-lock|tools/);
  });

  test('the server function runs in the European Union', () => {
    expect(config.regions).toEqual(['fra1']);
  });
});
