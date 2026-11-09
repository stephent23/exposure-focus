import { defineConfig } from '@playwright/test';

// Serves the BUILT site (run `npm run build` first).
const port = 4322;

export default defineConfig({
  testDir: 'tests/a11y',
  // Not *.spec.ts or *.test.ts, so vitest's default include never picks these up.
  testMatch: '**/*.a11y.ts',
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `npx astro preview --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
