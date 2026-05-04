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
      <header className="flex items-start justify-between border-b border-lphie-ink/10 px-5 py-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          {subtitle && <p className="text-sm text-lphie-ink/60">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5">{children}</div>
    </Card>
  );
}
