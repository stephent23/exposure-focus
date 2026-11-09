/**
 * The date the site is built "as of", as UTC YYYY-MM-DD.
 * EXPOSURE_BUILD_DATE overrides the clock so builds (and tests) are deterministic.
 */
export function buildDate(): string {
  const override = process.env.EXPOSURE_BUILD_DATE;
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`EXPOSURE_BUILD_DATE must be YYYY-MM-DD, got "${override}"`);
    }
    return override;
  }
  return new Date().toISOString().slice(0, 10);
}
