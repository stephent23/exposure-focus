import { expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

const css = readFileSync('src/styles/fonts.css', 'utf-8');
const urls = [...css.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)].map((m) => m[1]);
const woff2 = readdirSync('public/fonts').filter((f) => f.endsWith('.woff2'));

it('self-hosts: every url() is a local file under public/, and every woff2 is used', () => {
  for (const u of urls) {
    expect(u.startsWith('/') && !u.startsWith('//'), u).toBe(true);
    expect(existsSync(`public${u}`), u).toBe(true);
  }
  expect(woff2.length).toBe(6);
  for (const f of woff2) expect(urls, f).toContain(`/fonts/${f}`);
});

it('declares the six expected family and weight pairs', () => {
  const pairs = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, b]) => {
    expect(b).toMatch(/font-style:\s*normal/);
    expect(b).toMatch(/font-display:\s*swap/);
    return `${/font-family:\s*['"]([^'"]+)['"]/.exec(b)?.[1]} ${/font-weight:\s*(\d+)/.exec(b)?.[1]}`;
  });
  expect(pairs.sort()).toEqual(
    ['IBM Plex Mono 400', 'IBM Plex Mono 500', 'IBM Plex Sans 400', 'IBM Plex Sans 500', 'IBM Plex Sans 600', 'IBM Plex Sans 700']
  );
});

it('serves real WOFF2 files, under 400 KB in total, with the licence', () => {
  for (const f of woff2) expect(readFileSync(`public/fonts/${f}`).subarray(0, 4).toString('latin1'), f).toBe('wOF2');
  const total = readdirSync('public/fonts').reduce((n, f) => n + statSync(`public/fonts/${f}`).size, 0);
  expect(total).toBeLessThan(400 * 1024);
  expect(existsSync('public/fonts/LICENSE.txt')).toBe(true);
});
