import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders ordinary markdown', () => {
    const html = renderMarkdown('## Heading\n\nSome **bold** text and a [link](https://vendor.example/advisory).');
    expect(html).toContain('<h2');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://vendor.example/advisory"');
  });

  it('shows raw HTML as text instead of running it (web content is data)', () => {
    const html = renderMarkdown('Before\n\n<script>alert(1)</script>\n\nInline <img src=x onerror=alert(1)> after');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('neutralises links that are not http, https, mailto, relative or anchors', () => {
    const html = renderMarkdown('[bad](javascript:alert(1)) and [ok](/rubric/) and [mail](mailto:a@b.co)');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="/rubric/"');
    expect(html).toContain('href="mailto:a@b.co"');
  });

  it('neutralises protocol-relative and backslash links', () => {
    for (const href of ['//evil.test/x', '/\\evil.test/x']) {
      const html = renderMarkdown(`[bad](<${href}>)`);
      expect(html, href).toContain('href="#"');
      expect(html, href).not.toContain('evil.test');
    }
  });

  it('never renders an image element; an image becomes a plain link', () => {
    const html = renderMarkdown('![alt text](https://tracker.test/pixel.png)');
    expect(html).not.toContain('<img');
    expect(html).toContain('<a href="https://tracker.test/pixel.png">alt text</a>');
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('   \n')).toBe('');
  });
});
