import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type Span = 4 | 6 | 8 | 12;

interface Props {
  title: string;
  subtitle?: string;
  colSpan?: Span;
  actions?: ReactNode;
  children: ReactNode;
}

const spanClass: Record<Span, string> = {
  4: "col-span-12 lg:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 lg:col-span-8",
  12: "col-span-12",
};

export function Widget({ title, subtitle, colSpan = 12, actions, children }: Props) {
  return (
    <Card className={spanClass[colSpan]}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-lphie-ink/10 px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold sm:text-lg">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-lphie-ink/60 sm:text-sm">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}
