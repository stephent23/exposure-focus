import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const dist = 'dist';
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

// Every index.html in the built folder is a route; 404.html is reached through a missing URL.
function routesFromDist(dir: string, prefix = '/'): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '_astro') {
      routes.push(...routesFromDist(join(dir, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.isFile() && entry.name === 'index.html') {
      routes.push(prefix);
    }
  }
  return routes;
}

const routes = routesFromDist(dist).sort();
const recordRoute = routes.find((r) => r.startsWith('/verdicts/') && r !== '/verdicts/') ?? '/';

async function scan(page: Page, path: string, label: string, expectedStatus?: number) {
  const response = await page.goto(path);
  if (expectedStatus) expect(response?.status(), `${label} status`).toBe(expectedStatus);
  else expect(response?.status(), `${label} status`).toBeLessThan(400);

  const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
  const describe = (v: (typeof violations)[number]) =>
    `${v.id} (${v.impact}) ${v.helpUrl}\n    ${v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(' '))
      .join('\n    ')}`;

  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  for (const v of violations.filter((x) => !blocking.includes(x))) {
    test.info().annotations.push({ type: 'axe-minor', description: describe(v) });
  }
  expect(blocking.map(describe), `${label}: serious or critical axe violations`).toEqual([]);
}

test.describe('axe at desktop width', () => {
  for (const route of routes) {
    test(`axe ${route}`, async ({ page }) => {
      await scan(page, route, route);
    });
  }

  test('axe on the 404 page', async ({ page }) => {
    await scan(page, '/this-page-does-not-exist/', '404 page', 404);
  });
});

test.describe('axe at phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of ['/', recordRoute]) {
    test(`axe ${route} at 390x844`, async ({ page }) => {
      await scan(page, route, `${route} (phone)`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, 'horizontal page scroll at phone width').toBe(false);
    });
  }
});

test('keyboard: a record page fold summary is focusable and shows visible focus', async ({ page }) => {
  await page.goto(recordRoute);
  const summary = page.locator('summary').first();
  await summary.focus();
  const info = await summary.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      focused: document.activeElement === el,
      outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
      shadow: s.boxShadow !== 'none'
    };
  });
  expect(info.focused, 'first summary takes focus').toBe(true);
  expect(info.outline || info.shadow, 'first summary focus is visible').toBe(true);
});

test('keyboard: skip link first, then the first card link, with visible focus', async ({ page }) => {
  await page.goto('/');
  const focusInfo = () =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      // A card link shows focus as a ring on the whole card (.card:focus-within), not on the link itself.
      const card = el.closest('.card');
      const c = card ? getComputedStyle(card) : null;
      return {
        text: (el.textContent ?? '').trim().slice(0, 40),
        className: el.className,
        inCard: Boolean(card),
        outline: (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || Boolean(c && c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0),
        shadow: s.boxShadow !== 'none'
      };
    });

  await page.keyboard.press('Tab');
  const first = await focusInfo();
  expect(first.className).toContain('skip');
  expect(first.outline || first.shadow, 'skip link focus is visible').toBe(true);

  let reachedCard = false;
  for (let i = 0; i < 40 && !reachedCard; i++) {
    await page.keyboard.press('Tab');
    const info = await focusInfo();
    expect(info.outline || info.shadow, `focus visible on "${info.text}"`).toBe(true);
    reachedCard = info.inCard;
  }
  expect(reachedCard, 'a card link is reachable by keyboard').toBe(true);
});
