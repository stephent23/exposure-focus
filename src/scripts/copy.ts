// Browser script: the "copy summary" button on a verdict page.
const button = document.getElementById('boss-copy') as HTMLButtonElement | null;
const source = document.getElementById('boss-text') as HTMLTextAreaElement | null;
const statusEl = document.getElementById('boss-status');
const fallback = document.getElementById('boss-fallback');

if (button && source && statusEl && fallback) {
  // Script ran: swap the visible textarea for the button. The textarea returns if copying fails.
  fallback.hidden = true;
  button.hidden = false;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source.value);
      statusEl.textContent = 'Copied';
    } catch {
      statusEl.textContent = 'Copy failed: select the text below and copy it';
      fallback.hidden = false;
    }
  });
}
