import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useEventCategories } from "@/hooks/useEventCategories";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { EventCategory } from "@/types/db";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STARTER_COLORS = [
  "#6B7280", // gray
  "#2563EB", // blue
  "#0891B2", // cyan
  "#059669", // emerald
  "#CA8A04", // yellow
  "#EA580C", // orange
  "#DB2777", // pink
  "#BE123C", // rose
  "#7A1F1F", // dark rose
  "#7C3AED", // violet
  "#0D9488", // teal
  "#C8A028", // lphie gold
  "#475569", // slate
];

/**
 * E-board-only manager for event categories. Brothers see categories
 * via the picker in the event modal; this is where they're authored.
 */
export function CategoryManagerModal({ open, onClose }: Props) {
  const { categories, loading, refetch } = useEventCategories();
  const { user, isEboard } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(STARTER_COLORS[0]);
  const [draftDesc, setDraftDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setEditingId(null);
    setCreating(false);
    setDraftName("");
    setDraftColor(STARTER_COLORS[0]);
    setDraftDesc("");
  }, [open]);

  function startEdit(cat: EventCategory) {
    setEditingId(cat.id);
    setCreating(false);
    setDraftName(cat.name);
    setDraftColor(cat.color);
    setDraftDesc(cat.description ?? "");
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setDraftName("");
    setDraftColor(STARTER_COLORS[0]);
    setDraftDesc("");
  }

  function cancelDraft() {
    setEditingId(null);
    setCreating(false);
  }

  async function saveDraft() {
    if (!user) return;
    if (!draftName.trim()) {
      toast.error("Give the category a name.");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(draftColor)) {
      toast.error("Color must be a 6-digit hex (e.g. #C8A028).");
      return;
    }
    setBusyId(editingId ?? "new");
    const payload = {
      name: draftName.trim(),
      color: draftColor,
      description: draftDesc.trim() || null,
    };
    let err: { message: string } | null = null;
    if (editingId) {
      const { error } = await supabase
        .from("event_categories")
        .update(payload)
        .eq("id", editingId);
      err = error;
    } else {
      const { error } = await supabase
        .from("event_categories")
        .insert({ ...payload, created_by: user.id });
      err = error;
    }
    setBusyId(null);
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success(editingId ? "Category updated." : "Category created.");
    cancelDraft();
    refetch();
  }

  async function remove(cat: EventCategory) {
    if (!confirm(`Delete category "${cat.name}"?\nEvents will keep working but lose their color.`))
      return;
    setBusyId(cat.id);
    const { error } = await supabase
      .from("event_categories")
      .delete()
      .eq("id", cat.id);
    setBusyId(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Category deleted.");
      refetch();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calendar categories"
      width="md"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-lphie-ink/70">
          Categories show up as color-coded events on the calendar. E-board
          can add, recolor, or remove categories — brothers pick from this
          list when they create an event.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-lphie-ink/5">
            {categories.map((c) =>
              editingId === c.id ? (
                <li
                  key={c.id}
                  className="border-b border-lphie-ink/5 bg-lphie-cream/50 px-3 py-3 last:border-b-0"
                >
                  <CategoryForm
                    name={draftName}
                    color={draftColor}
                    description={draftDesc}
                    onName={setDraftName}
                    onColor={setDraftColor}
                    onDescription={setDraftDesc}
                    onSave={saveDraft}
                    onCancel={cancelDraft}
                    saving={busyId === c.id}
                  />
                </li>
              ) : (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 border-b border-lphie-ink/5 bg-white px-3 py-2 text-sm last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-4 w-4 shrink-0 rounded"
                      style={{ backgroundColor: c.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      {c.description && (
                        <p className="truncate text-xs text-lphie-ink/60">
                          {c.description}
                        </p>
                      )}
                    </div>
                    {c.is_default && (
                      <span className="shrink-0 rounded-full bg-lphie-ink/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-lphie-ink/60">
                        default
                      </span>
                    )}
                  </div>
                  {isEboard && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        disabled={busyId === c.id}
                        className="rounded p-1 text-lphie-ink/50 hover:bg-lphie-ink/5 hover:text-lphie-ink disabled:opacity-40"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(c)}
                        disabled={busyId === c.id}
                        className="rounded p-1 text-lphie-ink/50 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </li>
              )
            )}
            {categories.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-lphie-ink/50">
                No categories yet.
              </li>
            )}
          </ul>
        )}

        {isEboard && !creating && (
          <Button variant="secondary" onClick={startCreate} className="w-full">
            <Plus size={14} /> New category
          </Button>
        )}

        {isEboard && creating && (
          <div className="rounded-xl border border-dashed border-lphie-gold/40 bg-lphie-gold/5 p-3">
            <CategoryForm
              name={draftName}
              color={draftColor}
              description={draftDesc}
              onName={setDraftName}
              onColor={setDraftColor}
              onDescription={setDraftDesc}
              onSave={saveDraft}
              onCancel={cancelDraft}
              saving={busyId === "new"}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

function CategoryForm({
  name,
  color,
  description,
  onName,
  onColor,
  onDescription,
  onSave,
  onCancel,
  saving,
}: {
  name: string;
  color: string;
  description: string;
  onName: (v: string) => void;
  onColor: (v: string) => void;
  onDescription: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Input
        label="Name"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="e.g. Big Brother Reveal"
      />
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
          Color
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {STARTER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColor(c)}
              className={`h-7 w-7 rounded-full ring-2 transition-transform ${
                color === c
                  ? "ring-lphie-ink scale-110"
                  : "ring-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => onColor(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded-full border border-lphie-ink/15"
            aria-label="Custom color"
          />
        </div>
      </div>
      <Input
        label="Description (optional)"
        value={description}
        onChange={(e) => onDescription(e.target.value)}
        placeholder="What this category is for"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X size={14} /> Cancel
        </Button>
        <Button size="sm" onClick={onSave} isLoading={saving}>
          <Check size={14} /> Save
        </Button>
      </div>
    </div>
  );
}
