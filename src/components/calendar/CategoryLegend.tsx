import { Settings2 } from "lucide-react";
import { useState } from "react";
import { useEventCategories } from "@/hooks/useEventCategories";
import { useCalendarStore, UNCATEGORIZED_FILTER_KEY } from "@/stores/calendarStore";
import { useAuth } from "@/hooks/useAuth";
import { CategoryManagerModal } from "./CategoryManagerModal";

/**
 * Apple/Google-Calendar style category legend.
 * Each chip is a click-toggle that shows/hides events of that
 * category. E-board sees a "Manage" link to open the category editor.
 */
export function CategoryLegend() {
  const { categories, loading } = useEventCategories();
  const { hiddenCategories, toggleCategory } = useCalendarStore();
  const { isEboard } = useAuth();
  const [managerOpen, setManagerOpen] = useState(false);

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-lphie-ink/5 bg-white p-3 shadow-widget">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-lphie-ink/60">
          Categories
        </p>
        {isEboard && (
          <button
            onClick={() => setManagerOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-lphie-accent hover:underline"
          >
            <Settings2 size={11} /> Manage
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const hidden = hiddenCategories.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleCategory(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-opacity ${
                hidden
                  ? "border-lphie-ink/10 bg-white text-lphie-ink/40"
                  : "border-transparent bg-white text-lphie-ink shadow-sm"
              }`}
              title={hidden ? `Show ${c.name}` : `Hide ${c.name}`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  hidden ? "opacity-40" : ""
                }`}
                style={{ backgroundColor: c.color }}
                aria-hidden="true"
              />
              {c.name}
            </button>
          );
        })}
        {/* Uncategorized chip — for events with no category_id */}
        <UncategorizedChip />
      </div>

      <CategoryManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
    </div>
  );
}

function UncategorizedChip() {
  const { hiddenCategories, toggleCategory } = useCalendarStore();
  const hidden = hiddenCategories.includes(UNCATEGORIZED_FILTER_KEY);
  return (
    <button
      onClick={() => toggleCategory(UNCATEGORIZED_FILTER_KEY)}
      className={`inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-semibold transition-opacity ${
        hidden
          ? "border-lphie-ink/15 bg-white text-lphie-ink/40"
          : "border-lphie-ink/20 bg-white text-lphie-ink/70"
      }`}
      title={hidden ? "Show uncategorized" : "Hide uncategorized"}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-lphie-ink/30 ${
          hidden ? "opacity-40" : ""
        }`}
        aria-hidden="true"
      />
      Uncategorized
    </button>
  );
}
