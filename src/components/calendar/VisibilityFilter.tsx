import { useCalendarStore, type VisibilityFilter as VF } from "@/stores/calendarStore";

const options: { value: VF; label: string }[] = [
  { value: "all", label: "All" },
  { value: "global", label: "Global" },
  { value: "eboard_only", label: "E-Board" },
];

export function VisibilityFilter() {
  const { visibilityFilter, setVisibilityFilter } = useCalendarStore();
  return (
    <div className="inline-flex rounded-lg border border-lphie-ink/10 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setVisibilityFilter(o.value)}
          className={[
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            visibilityFilter === o.value
              ? "bg-lphie-gold text-lphie-ink"
              : "text-lphie-ink/60 hover:bg-lphie-ink/5",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
