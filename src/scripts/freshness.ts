// Browser script: keeps the "New", "Changed" and "Overdue for review" flags current without a rebuild.
import { freshLabel, isPastReview, todayUtc } from '../lib/fresh-dates';

const today = todayUtc();

document.querySelectorAll<HTMLElement>('span.fresh[data-published]').forEach((el) => {
  const label = freshLabel(el.dataset.published ?? '', el.dataset.changed || undefined, today);
  if (label) {
    el.textContent = label;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
});

document.querySelectorAll<HTMLElement>('.tag-stale[data-review-until]').forEach((el) => {
  el.hidden = !isPastReview(el.dataset.reviewUntil ?? '', today);
});
