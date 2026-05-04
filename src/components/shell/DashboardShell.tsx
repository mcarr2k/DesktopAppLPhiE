import type { ReactNode } from "react";
import { POSITION_LABELS, type Position } from "@/types/role";

interface Props {
  position: Position;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function DashboardShell({ position, title, subtitle, children }: Props) {
  return (
    <div className="p-8">
      <header className="mb-8 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lphie-gold/30 font-display text-xl font-bold text-lphie-ink">
          {position === "president"
            ? "P"
            : position === "vp_internal"
              ? "VI"
              : position === "vp_external"
                ? "VE"
                : position === "treasurer"
                  ? "T"
                  : "S"}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-lphie-ink/60">
            {POSITION_LABELS[position]}
          </p>
          <h1 className="font-display text-3xl font-bold text-lphie-ink">{title}</h1>
          {subtitle && <p className="text-sm text-lphie-ink/70">{subtitle}</p>}
        </div>
      </header>
      <div className="grid grid-cols-12 gap-6">{children}</div>
    </div>
  );
}
