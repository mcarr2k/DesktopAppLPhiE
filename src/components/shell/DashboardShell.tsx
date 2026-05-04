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
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lphie-gold/30 font-display text-lg font-bold text-lphie-ink sm:h-14 sm:w-14 sm:text-xl">
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
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-lphie-ink/60 sm:text-xs">
            {POSITION_LABELS[position]}
          </p>
          <h1 className="font-display text-xl font-bold text-lphie-ink sm:text-2xl lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-lphie-ink/70 sm:text-sm">{subtitle}</p>
          )}
        </div>
      </header>
      <div className="grid grid-cols-12 gap-4 sm:gap-6">{children}</div>
    </div>
  );
}
