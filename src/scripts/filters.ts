// Browser script: live filtering of the verdict cards on the home page.
// The tier checkboxes, attack select and reset button only exist for long lists, so each is optional.
import { matchesFilters } from '../lib/filters';

const form = document.getElementById('filters') as HTMLFormElement | null;
if (form) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));
  const bands = Array.from(document.querySelectorAll<HTMLElement>('[data-band]'));
  const q = document.getElementById('q') as HTMLInputElement | null;
  const kind = document.getElementById('kind') as HTMLSelectElement | null;
  const count = document.getElementById('count');
  const none = document.getElementById('none');
  const reset = document.getElementById('reset');

  const apply = () => {
    const text = (q?.value ?? '').trim().toLowerCase();
    const kindValue = kind?.value ?? '';
    const tiers = Array.from(form.querySelectorAll<HTMLInputElement>('input[name=tier]:checked')).map((c) => c.value);
    const active = Boolean(text || tiers.length || kindValue);
    let shown = 0;
    for (const c of cards) {
      const ok = matchesFilters(
        { text: c.dataset.text ?? '', tiers: c.dataset.tiers ?? '', kind: c.dataset.kind ?? '' },
        { text, tiers, kind: kindValue }
      );
      c.hidden = !ok;
      if (ok) shown++;
    }
    for (const b of bands) b.hidden = !b.querySelector('.card:not([hidden])');
    if (none) none.hidden = shown !== 0;
    if (reset) reset.hidden = !active;
    if (count) count.textContent = active ? `${shown} of ${cards.length} verdicts` : `${cards.length} verdicts`;
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', apply);
  form.addEventListener('reset', () => setTimeout(apply, 0));
}
