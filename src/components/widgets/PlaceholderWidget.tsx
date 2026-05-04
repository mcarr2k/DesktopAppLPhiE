import { Widget } from "@/components/shell/Widget";
import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  description: string;
  colSpan?: 4 | 6 | 8 | 12;
  phase?: number;
}

export function PlaceholderWidget({
  title,
  subtitle,
  description,
  colSpan = 6,
  phase = 2,
}: Props) {
  return (
    <Widget
      title={title}
      subtitle={subtitle}
      colSpan={colSpan}
      actions={
        <span className="inline-flex items-center gap-1 rounded-full bg-lphie-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/60">
          <Sparkles size={10} /> Phase {phase}
        </span>
      }
    >
      <p className="text-sm text-lphie-ink/70">{description}</p>
    </Widget>
  );
}
