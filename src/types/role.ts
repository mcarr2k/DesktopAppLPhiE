export const ROLES = [
  "president",
  "vp_internal",
  "vp_external",
  "treasurer",
  "secretary",
  "member",
] as const;

export type Role = (typeof ROLES)[number];

export const EBOARD_ROLES: Role[] = [
  "president",
  "vp_internal",
  "vp_external",
  "treasurer",
  "secretary",
];

export type Position = Exclude<Role, "member">;

export const POSITION_LABELS: Record<Role, string> = {
  president: "President",
  vp_internal: "Vice President — Internal",
  vp_external: "Vice President — External",
  treasurer: "Treasurer",
  secretary: "Secretary",
  member: "Member",
};

export const POSITION_SLUG: Record<Position, string> = {
  president: "president",
  vp_internal: "vp-internal",
  vp_external: "vp-external",
  treasurer: "treasurer",
  secretary: "secretary",
};

export function slugToPosition(slug: string): Position | null {
  switch (slug) {
    case "president":
      return "president";
    case "vp-internal":
      return "vp_internal";
    case "vp-external":
      return "vp_external";
    case "treasurer":
      return "treasurer";
    case "secretary":
      return "secretary";
    default:
      return null;
  }
}
