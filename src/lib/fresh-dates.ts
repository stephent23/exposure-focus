// Date helpers shared by the build and the browser. No imports, so this file can ship to the page as is.

export const WINDOW = 7; // days a verdict counts as new or changed

/** Whole days from one YYYY-MM-DD date to another, computed in UTC. */
function dayDiff(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000;
}

/** 'New' if published within WINDOW days, else 'Changed' if changed within WINDOW days, else null. */
export function freshLabel(published: string, changed: string | undefined, today: string): 'New' | 'Changed' | null {
  if (dayDiff(published, today) <= WINDOW) return 'New';
  if (changed !== undefined && dayDiff(changed, today) <= WINDOW) return 'Changed';
  return null;
}

/** True once today is after the review date. */
export function isPastReview(reviewUntil: string, today: string): boolean {
  return dayDiff(reviewUntil, today) > 0;
}

/** Today's date as YYYY-MM-DD in UTC. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
