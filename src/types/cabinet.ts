/**
 * Cabinet / committee chair titles.
 * These are NOT e-board officers (the 5 in role_t are). Cabinet chairs
 * are brothers with delegated responsibility — they show up in the
 * directory with a title, and the President / VP Internal / VP External
 * delegate work to them via tasks.
 *
 * Stored as free-form text in `profiles.title` so the chapter can add
 * positions without a schema migration. The constants here are just
 * the suggested defaults that show up in the directory dropdown.
 */

export const CABINET_GROUPS = {
  internal: {
    label: "Internal cabinet (under VP Internal)",
    titles: [
      "Academic Chair",
      "New Member Educator",
      "Assistant New Member Educator",
      "Brotherhood Chair",
      "Risk Management Chair",
      "Historian",
      "Service Chair",
      "Culture Chair",
      "Alumni Chair",
    ],
  },
  external: {
    label: "External cabinet (under VP External)",
    titles: [
      "Rush Chair",
      "PR Chair",
      "Philanthropy Chair",
      "Webmaster",
      "Merchandise Chair",
      "Stroll Captain",
      "AASU Representative",
      "UCFS Representative",
    ],
  },
  treasurer: {
    label: "Finance cabinet (under Treasurer)",
    titles: ["Fundraising Chair"],
  },
  other: {
    label: "Other titles",
    titles: ["Founding Brother", "Faculty Advisor", "Board of Directors"],
  },
} as const;

export const ALL_CABINET_TITLES: string[] = Object.values(CABINET_GROUPS).flatMap(
  (g) => [...g.titles]
);

/**
 * Maps a cabinet title to the calendar categories the holder typically
 * works in. Used to:
 *   1. Pre-fill the category dropdown when a cabinet chair adds an event.
 *   2. Filter the "My cabinet" Home widget to relevant events.
 *
 * Names must match seed values in supabase/schema.sql `event_categories`.
 */
export const TITLE_TO_CATEGORIES: Record<string, string[]> = {
  "New Member Educator": ["NME"],
  "Assistant New Member Educator": ["NME"],
  "Brotherhood Chair": ["Brotherhood"],
  "Service Chair": ["Service"],
  "Philanthropy Chair": ["Philanthropy"],
  "Fundraising Chair": ["Fundraising"],
  "Rush Chair": ["Rush"],
  "PR Chair": ["Mixer / Social", "Rush"],
  "Risk Management Chair": ["Risk / Training"],
  "Historian": ["Brotherhood"],
  "Culture Chair": ["Cultural / AASU"],
  "AASU Representative": ["Cultural / AASU"],
  "Merchandise Chair": ["Mixer / Social"],
  "Stroll Captain": ["Cultural / AASU", "Mixer / Social"],
  "Alumni Chair": ["Brotherhood"],
  "Academic Chair": ["Risk / Training"],
};

/**
 * Returns the deduplicated list of category names suggested for a
 * brother given their current titles. First entry is the suggested
 * default for new events.
 */
export function categoriesForTitles(titles: string[]): string[] {
  const out = new Set<string>();
  titles.forEach((t) => TITLE_TO_CATEGORIES[t]?.forEach((c) => out.add(c)));
  return Array.from(out);
}
