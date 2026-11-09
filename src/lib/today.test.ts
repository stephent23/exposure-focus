import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildDate } from './today';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('buildDate', () => {
  it('uses EXPOSURE_BUILD_DATE when set', () => {
    vi.stubEnv('EXPOSURE_BUILD_DATE', '2099-01-01');
    expect(buildDate()).toBe('2099-01-01');
  });

  it('throws a clear error when EXPOSURE_BUILD_DATE is malformed', () => {
    vi.stubEnv('EXPOSURE_BUILD_DATE', '1 Jan 2099');
    expect(() => buildDate()).toThrow(/EXPOSURE_BUILD_DATE.*YYYY-MM-DD/);
  });

  it('falls back to today in UTC', () => {
    vi.stubEnv('EXPOSURE_BUILD_DATE', '');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T23:59:59Z'));
    expect(buildDate()).toBe('2026-03-04');
  });
});
