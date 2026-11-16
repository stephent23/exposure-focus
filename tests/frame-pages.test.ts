import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGIN = 'https://exposure.infosecuriosity.co.uk';
const dist = join(process.cwd(), 'dist-test');
const read = (...p: string[]) => readFileSync(join(dist, ...p), 'utf-8');
const files = (dir = dist): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

const pages = files().filter((f) => f.endsWith('.html'));
const meta = (html: string, attr: 'property' | 'name', key: string) =>
  html.match(new RegExp(`<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${key}"`, 'i'))?.[1];

describe('page frame', () => {
  it('builds some pages', () => {
    expect(pages.length).toBeGreaterThan(3);
  });

  it('gives every page a canonical link and Open Graph tags on the site origin', () => {
    for (const page of pages) {
      const html = readFileSync(page, 'utf-8');
      const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1];
      expect(canonical, page).toBeTruthy();
      expect(canonical!.startsWith(ORIGIN), page).toBe(true);
      expect(meta(html, 'property', 'og:title'), page).toBeTruthy();
      expect(meta(html, 'property', 'og:description'), page).toBeTruthy();
      expect(meta(html, 'property', 'og:url')?.startsWith(ORIGIN), page).toBe(true);
      expect(meta(html, 'property', 'og:site_name'), page).toBe('Exposure Focus');
      expect(meta(html, 'name', 'twitter:card'), page).toBe('summary');
      expect(meta(html, 'name', 'theme-color'), page).toBeTruthy();
    }
  });

  it('has exactly one h1 on every page', () => {
    for (const page of pages) {
      expect(count(readFileSync(page, 'utf-8'), /<h1[\s>]/gi), page).toBe(1);
    }
  });

  it('prints cleanly: built CSS has an @media print block hiding the nav', () => {
    const css = files()
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf-8'))
      .join('\n');
    const start = css.indexOf('@media print');
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start)).toMatch(/nav[^{}]*\{[^}]*display:\s*none/);
  });

  it('links the 404 page back to the verdicts list', () => {
    expect(read('404.html')).toMatch(/<a[^>]*href="\/"[^>]*>[^<]*verdicts/i);
  });
});
