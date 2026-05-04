import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useSops } from "@/hooks/useSops";
import { useAuth } from "@/hooks/useAuth";
import { canManageSops } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { MinutesEditor } from "@/components/minutes/MinutesEditor";
import { formatDate } from "@/lib/dates";
import type { Sop } from "@/types/db";

export function SOPLibrary({ colSpan = 12 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { sops, loading, refetch } = useSops();
  const { role } = useAuth();
  const canEdit = canManageSops(role);
  const [editing, setEditing] = useState<Sop | null>(null);
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Sop[]>();
    sops.forEach((s) => {
      const cat = s.category ?? "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sops]);

  return (
    <Widget
      title="SOP library"
      subtitle="Standard operating procedures — read by all, edited by VP Internal / President"
      colSpan={colSpan}
      actions={
        canEdit && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New SOP
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : sops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-lphie-cream/40 p-6 text-center text-sm text-lphie-ink/60">
          No SOPs yet. {canEdit && "Click \"New SOP\" to author your first one."}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
                {category}
              </h4>
              <ul className="overflow-hidden rounded-xl border border-lphie-ink/5">
                {items.map((s) => (
                  <li
                    key={s.id}
                    className="flex cursor-pointer items-center justify-between border-b border-lphie-ink/5 bg-white px-4 py-3 text-sm last:border-b-0 hover:bg-lphie-cream/50"
                    onClick={() => setEditing(s)}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen size={16} className="text-lphie-ink/40" />
                      <div>
                        <p className="font-semibold">{s.title}</p>
                        <p className="text-xs text-lphie-ink/50">
                          v{s.version} · updated {formatDate(s.updated_at)}
                        </p>
                      </div>
                    </div>
                    <Badge>v{s.version}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <SOPEditor
        sop={editing}
        creating={creating}
        canEdit={canEdit}
        onClose={() => {
          setEditing(null);
          setCreating(false);
          refetch();
        }}
      />
    </Widget>
  );
}

function SOPEditor({
  sop,
  creating,
  canEdit,
  onClose,
}: {
  sop: Sop | null;
  creating: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const open = !!sop || creating;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(sop?.title ?? "");
    setCategory(sop?.category ?? "");
    setBodyHtml(sop?.body_html ?? "");
  }, [open, sop]);

  async function save() {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Add a title.");
      return;
    }
    setSubmitting(true);
    if (sop) {
      const { error } = await supabase
        .from("sops")
        .update({
          title: title.trim(),
          category: category.trim() || null,
          body_html: bodyHtml,
          version: sop.version + 1,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sop.id);
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("sops").insert({
        title: title.trim(),
        category: category.trim() || null,
        body_html: bodyHtml,
        updated_by: user.id,
      });
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    toast.success("SOP saved.");
    onClose();
  }

  async function remove() {
    if (!sop) return;
    if (!confirm(`Delete SOP "${sop.title}"?`)) return;
    const { error } = await supabase.from("sops").delete().eq("id", sop.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted.");
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? "New SOP" : sop?.title ?? "SOP"}
      width="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {sop && canEdit && (
              <Button variant="danger" size="sm" onClick={remove}>
                <Trash2 size={14} /> Delete
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {canEdit ? "Cancel" : "Close"}
            </Button>
            {canEdit && (
              <Button onClick={save} isLoading={submitting}>
                Save
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
          />
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Operations, NME, Risk"
            disabled={!canEdit}
          />
        </div>
        <MinutesEditor
          value={bodyHtml}
          onChange={(html) => setBodyHtml(html)}
          editable={canEdit}
        />
      </div>
    </Modal>
  );
}
