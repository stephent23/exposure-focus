import { defineConfig } from 'vitest/config';

// Tests in tests/a11y are Playwright's (*.a11y.ts), so vitest's default include never sees them.
export default defineConfig({
  test: { globalSetup: ['tests/global-setup.ts'], testTimeout: 30000 }
});
