import { EBOARD_ROLES, type Role } from "@/types/role";

export function isEboard(role: Role | null | undefined): boolean {
  return !!role && EBOARD_ROLES.includes(role);
}

export type EventVisibility = "global" | "eboard_only";

export function canCreateEvent(
  role: Role | null | undefined,
  visibility: EventVisibility
): boolean {
  if (!role) return false;
  if (visibility === "global") return true;
  return isEboard(role);
}

export function canEditDirectory(role: Role | null | undefined): boolean {
  return role === "president" || role === "treasurer";
}

export function canWriteMinutes(role: Role | null | undefined): boolean {
  return role === "secretary" || role === "president";
}

export function canIssueFines(role: Role | null | undefined): boolean {
  return role === "vp_internal" || role === "president";
}

export function canManageDues(role: Role | null | undefined): boolean {
  return role === "treasurer" || role === "president";
}

export function canManageSops(role: Role | null | undefined): boolean {
  return role === "vp_internal" || role === "president";
}
