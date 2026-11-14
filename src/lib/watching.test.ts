import { describe, expect, it } from 'vitest';

import { parseWatching } from './watching';

describe('parseWatching', () => {
  it('reads items, newest first', () => {
    const items = parseWatching('- { name: A, cves: [CVE-2026-1000], noted: 2026-11-01 }\n- { name: B, cves: [CVE-2026-2000, CVE-2026-2001], noted: 2026-11-05 }\n');
    expect(items.map((i) => i.name)).toEqual(['B', 'A']);
    expect(items[0].cves).toEqual(['CVE-2026-2000', 'CVE-2026-2001']);
  });
  it('treats an empty file as no items', () => {
    expect(parseWatching('')).toEqual([]);
    expect(parseWatching('[]')).toEqual([]);
  });
  it('refuses an item without a real CVE ID, a date or a short name', () => {
    expect(() => parseWatching('- { name: A, cves: [], noted: 2026-11-01 }')).toThrow();
    expect(() => parseWatching('- { name: A, cves: [not-a-cve], noted: 2026-11-01 }')).toThrow();
    expect(() => parseWatching('- { name: A, cves: [CVE-2026-1000] }')).toThrow();
    expect(() => parseWatching(`- { name: ${'a'.repeat(81)}, cves: [CVE-2026-1000], noted: 2026-11-01 }`)).toThrow();
    expect(() => parseWatching('- { name: A, cves: [CVE-2026-1000], noted: 2026-11-01, tier: 1 }')).toThrow();
  });
});
