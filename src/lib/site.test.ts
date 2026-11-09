import { describe, expect, it } from 'vitest';

import { SITE, isRealUrl } from './site';

describe('isRealUrl', () => {
  it('accepts an https URL', () => {
    expect(isRealUrl('https://newsletter.provider.test/subscribe')).toBe(true);
  });

  it.each([
    null,
    undefined,
    '',
    '[link to add]',
    '[contact to add]',
    'http://provider.test/form',
    'javascript:alert(1)',
    'mailto:someone@provider.test',
    'https://example.com/form',
    'https://www.example.org/',
    'not a url'
  ])('rejects %j', (value) => {
    expect(isRealUrl(value)).toBe(false);
  });
});

describe('SITE', () => {
  it('has a name, and only real URLs or null for the owner-set links', () => {
    expect(SITE.name).toBe('Exposure Focus');
    for (const value of [SITE.newsletterUrl, SITE.contactUrl]) {
      expect(value === null || isRealUrl(value)).toBe(true);
    }
  });
});
