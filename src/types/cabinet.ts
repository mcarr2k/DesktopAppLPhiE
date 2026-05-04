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
