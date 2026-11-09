// The rule the home page filters use to decide whether a card is shown.
export interface CardData {
  /** Lower-case searchable text. */
  text: string;
  /** Space-separated tier numbers present on the record. */
  tiers: string;
  kind: string;
}

export interface Filters {
  text: string;
  tiers: string[];
  kind: string;
}

export function matchesFilters(card: CardData, filters: Filters): boolean {
  const text = filters.text.trim().toLowerCase();
  const present = ` ${card.tiers} `;
  return (
    (!text || card.text.includes(text)) &&
    (!filters.kind || card.kind === filters.kind) &&
    (filters.tiers.length === 0 || filters.tiers.some((t) => present.includes(` ${t} `)))
  );
}
