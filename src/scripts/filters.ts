// Browser script: live filtering of the verdict cards on the home page.
import { matchesFilters } from '../lib/filters';

const form = document.getElementById('filters') as HTMLFormElement | null;
if (form) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));
  const bands = Array.from(document.querySelectorAll<HTMLElement>('[data-band]'));
  const q = document.getElementById('q') as HTMLInputElement;
  const kind = document.getElementById('kind') as HTMLSelectElement;
  const count = document.getElementById('count') as HTMLElement;
  const none = document.getElementById('none') as HTMLElement;
  const reset = document.getElementById('reset') as HTMLElement;

  const apply = () => {
    const text = q.value.trim().toLowerCase();
    const tiers = Array.from(form.querySelectorAll<HTMLInputElement>('input[name=tier]:checked')).map((c) => c.value);
    const active = Boolean(text || tiers.length || kind.value);
    let shown = 0;
    for (const c of cards) {
      const ok = matchesFilters(
        { text: c.dataset.text ?? '', tiers: c.dataset.tiers ?? '', kind: c.dataset.kind ?? '' },
        { text, tiers, kind: kind.value }
      );
      c.hidden = !ok;
      if (ok) shown++;
    }
    for (const b of bands) b.hidden = !b.querySelector('.card:not([hidden])');
    none.hidden = shown !== 0;
    reset.hidden = !active;
    count.textContent = active ? `${shown} of ${cards.length} verdicts` : `${cards.length} verdicts`;
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('input', apply);
  form.addEventListener('reset', () => setTimeout(apply, 0));
}
