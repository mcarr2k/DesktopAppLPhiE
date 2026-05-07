import type { Profile } from "@/types/db";

/**
 * Returns the brother's effective titles list.
 * Falls back to the legacy single `title` column for any row that
 * existed before the array migration was applied — keeps the UI
 * usable even if a chapter forgot to re-run schema.sql.
 */
export function effectiveTitles(profile: Pick<Profile, "titles" | "title">): string[] {
  if (profile.titles && profile.titles.length > 0) return profile.titles;
  if (profile.title) return [profile.title];
  return [];
}

/** Comma-joined display version. "" if none. */
export function joinTitles(profile: Pick<Profile, "titles" | "title">): string {
  return effectiveTitles(profile).join(" · ");
}

/** Truncated version for tight headers (Sidebar pill, etc.). */
export function joinTitlesShort(
  profile: Pick<Profile, "titles" | "title">,
  max = 1
): string {
  const all = effectiveTitles(profile);
  if (all.length === 0) return "";
  if (all.length <= max) return all.join(" · ");
  return `${all.slice(0, max).join(" · ")} +${all.length - max}`;
}
