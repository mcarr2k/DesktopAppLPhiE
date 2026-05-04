import type { ReactNode } from "react";
import type { Role } from "@/types/role";
import { POSITION_LABELS } from "@/types/role";

const roleColors: Record<Role, string> = {
  president: "bg-lphie-gold/30 text-lphie-ink ring-lphie-gold/40",
  vp_internal: "bg-purple-100 text-purple-900 ring-purple-200",
  vp_external: "bg-rose-100 text-rose-900 ring-rose-200",
  treasurer: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  secretary: "bg-sky-100 text-sky-900 ring-sky-200",
  member: "bg-lphie-ink/5 text-lphie-ink/70 ring-lphie-ink/10",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        roleColors[role],
      ].join(" ")}
    >
      {POSITION_LABELS[role]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "success" | "danger";
}) {
  const tones = {
    neutral: "bg-lphie-ink/5 text-lphie-ink/70",
    gold: "bg-lphie-gold/20 text-lphie-ink",
    success: "bg-emerald-100 text-emerald-900",
    danger: "bg-rose-100 text-rose-900",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
