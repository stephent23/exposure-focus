// Renders record text as safe HTML: raw HTML shown as text, images as links, only safe link schemes kept.
import { Marked, type Token, type Tokens } from 'marked';

// Http(s), mailto, a root-relative path (not `//host` or `/\host`, which browsers treat as another site) or an anchor.
const SAFE_LINK = /^(https?:\/\/|mailto:|\/(?![/\\])|#)/i;

// Record text can quote advisories and news pages, which is data, never markup or instructions.
const marked = new Marked({
  async: false,
  gfm: true,
  walkTokens(token: Token) {
    if (token.type === 'html') {
      const t = token as Tokens.Generic;
      t.type = 'text';
      t.text = t.raw;
      t.escaped = false;
      delete t.tokens;
    }
    if (token.type === 'image') {
      const t = token as Tokens.Generic;
      const label = t.text || t.href;
      t.type = 'link';
      t.tokens = [{ type: 'text', raw: label, text: label }];
    }
    if (token.type === 'link') {
      const t = token as Tokens.Link;
      if (!SAFE_LINK.test(t.href.trim())) t.href = '#';
    }
  }
});

export function renderMarkdown(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return '';
  return marked.parse(trimmed) as string;
}
