import { execSync } from 'node:child_process';

// Builds the site once into dist-test/, as of 2099-01-01 so every published record is overdue for review.
export default function setup() {
  try {
    execSync('npx astro build --outDir dist-test', {
      env: { ...process.env, EXPOSURE_BUILD_DATE: '2099-01-01' },
      encoding: 'utf-8',
      stdio: 'pipe'
    });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    throw new Error(`astro build failed:\n${err.stdout}\n${err.stderr}`);
  }
}
