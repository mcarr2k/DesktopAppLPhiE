import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CABINET_GROUPS } from "@/types/cabinet";
import type { Profile } from "@/types/db";
import { effectiveTitles } from "@/lib/titles";

interface Props {
  open: boolean;
  brother: Profile | null;
  saving?: boolean;
  onSave: (titles: string[]) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Multi-title editor. A brother can hold any combination of cabinet
 * positions; the predefined ones are grouped checkboxes, plus an
 * "Add custom" input for chapter-specific roles not in the list.
 */
export function TitlesEditorModal({
  open,
  brother,
  saving,
  onSave,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customInput, setCustomInput] = useState("");

  // Sync the working set every time the modal opens for a new brother.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(brother ? effectiveTitles(brother) : []));
    setCustomInput("");
  }, [open, brother]);

  // The "predefined" set is everything in CABINET_GROUPS. Anything in
  // `selected` not in that list is shown under "Custom" so it doesn't
  // disappear if the chapter previously typed a one-off title.
  const allPredefined = useMemo(() => {
    return new Set<string>(
      Object.values(CABINET_GROUPS).flatMap((g) => [...g.titles])
    );
  }, []);

  const customSelections = useMemo(
    () => Array.from(selected).filter((t) => !allPredefined.has(t)),
    [selected, allPredefined]
  );

  function toggle(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function addCustom() {
    const v = customInput.trim();
    if (!v) return;
    setSelected((prev) => new Set(prev).add(v));
    setCustomInput("");
  }

  const titles = Array.from(selected);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={brother ? `Cabinet titles · ${brother.full_name}` : "Cabinet titles"}
      width="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-lphie-ink/60">
            {titles.length === 0
              ? "No titles selected"
              : `${titles.length} title${titles.length === 1 ? "" : "s"} selected`}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(titles)} isLoading={saving}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Currently selected, shown as removable chips for fast cleanup */}
        {titles.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              Selected
            </h4>
            <div className="flex flex-wrap gap-2">
              {titles.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-lphie-gold/20 px-2.5 py-1 text-xs font-semibold text-lphie-ink ring-1 ring-inset ring-lphie-gold/40 hover:bg-lphie-gold/30"
                >
                  {t}
                  <X size={11} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grouped checkboxes by cabinet */}
        {Object.entries(CABINET_GROUPS).map(([key, group]) => (
          <div key={key}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              {group.label}
            </h4>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {group.titles.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-lphie-cream/60"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(t)}
                    onChange={() => toggle(t)}
                    className="h-4 w-4 accent-lphie-gold"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Anything custom that already exists on the brother */}
        {customSelections.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
              Custom titles already assigned
            </h4>
            <div className="flex flex-wrap gap-2">
              {customSelections.map((t) => (
                <Badge key={t} tone="gold">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Add a new chapter-specific custom title */}
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-lphie-cream/40 p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
            Add a custom title
          </h4>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. Chapter Photographer"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <Button
              size="md"
              variant="secondary"
              onClick={addCustom}
              disabled={!customInput.trim()}
            >
              <Plus size={14} /> Add
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
