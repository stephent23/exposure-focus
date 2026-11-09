// Owner-set site settings and the check for a real https link.
/** True only for a real https URL: not a placeholder, not an example.* host. */
export function isRealUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !/(^|\.)example\.(com|org|net)$/i.test(url.hostname);
  } catch {
    return false;
  }
}

/** Owner-set configuration. Leave a link as null until the owner has chosen one. */
export const SITE = {
  name: 'Exposure Focus',
  /** A hosted sign-up page. We collect and store nothing ourselves. */
  newsletterUrl: null as string | null,
  /** How readers reach the author. */
  contactUrl: null as string | null
};
