// The Atom feed of verdicts.
import type { APIContext } from 'astro';

import { buildFeed } from '../lib/feed';
import { getAllRecords } from '../lib/records';

export async function GET(context: APIContext) {
  if (!context.site) throw new Error('Set `site` in astro.config.mjs: the feed needs absolute links.');
  return new Response(buildFeed(await getAllRecords(), context.site.href), {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' }
  });
}
