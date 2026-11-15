import { describe, expect, it } from 'vitest';
import { freshLabel, isPastReview, todayUtc } from './fresh-dates';

describe('freshLabel', () => {
  it('is New on the publication day and exactly 7 days later, and null 8 days later', () => {
    expect(freshLabel('2026-11-10', undefined, '2026-11-10')).toBe('New');
    expect(freshLabel('2026-11-10', undefined, '2026-11-17')).toBe('New');
    expect(freshLabel('2026-11-10', undefined, '2026-11-18')).toBeNull();
  });

  it('is Changed within 7 days of a change when publication is older', () => {
    expect(freshLabel('2026-11-01', '2026-11-12', '2026-11-15')).toBe('Changed');
    expect(freshLabel('2026-11-01', '2026-11-08', '2026-11-15')).toBe('Changed');
    expect(freshLabel('2026-11-01', '2026-11-07', '2026-11-15')).toBeNull();
  });

  it('prefers New when both New and Changed apply', () => {
    expect(freshLabel('2026-11-12', '2026-11-14', '2026-11-15')).toBe('New');
  });

  it('is null when there is no change and publication is old', () => {
    expect(freshLabel('2026-11-01', undefined, '2026-11-15')).toBeNull();
  });
});

describe('isPastReview', () => {
  it('is false on the review day and true the day after', () => {
    expect(isPastReview('2026-11-15', '2026-11-15')).toBe(false);
    expect(isPastReview('2026-11-15', '2026-11-16')).toBe(true);
  });
});

describe('todayUtc', () => {
  it('gives the UTC calendar date', () => {
    expect(todayUtc(new Date('2026-11-15T23:30:00Z'))).toBe('2026-11-15');
    expect(todayUtc(new Date('2026-11-15T00:10:00+02:00'))).toBe('2026-11-14');
  });
});
