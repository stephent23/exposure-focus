// Browser script: the copy buttons on a verdict page (board summary and plain text).
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-copy]'));
const statusEl = document.getElementById('boss-status');
const fallback = document.getElementById('boss-fallback') as HTMLDetailsElement | null;

if (buttons.length > 0 && statusEl && fallback) {
  // Script ran: show the buttons. The folded text stays available, and opens if copying fails.
  for (const button of buttons) {
    const source = document.getElementById(button.dataset.copy ?? '');
    if (!source) continue;
    button.hidden = false;
    button.addEventListener('click', async () => {
      const value = source instanceof HTMLTextAreaElement ? source.value : (source.textContent ?? '').trim();
      try {
        await navigator.clipboard.writeText(value);
        statusEl.textContent = 'Copied';
      } catch {
        statusEl.textContent = 'Copy failed: open the text below and copy it';
        fallback.open = true;
      }
    });
  }
}
