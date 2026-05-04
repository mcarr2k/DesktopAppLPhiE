import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useMinutes } from "@/hooks/useMinutes";
import { useAuth } from "@/hooks/useAuth";
import { canWriteMinutes } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { MinutesEditor } from "@/components/minutes/MinutesEditor";
import { AttendanceRoster } from "@/components/minutes/AttendanceRoster";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/dates";
import type {
  Attendance,
  Minutes as MinutesRow,
  MinutesKind,
} from "@/types/db";

const KINDS: MinutesKind[] = ["regular", "cabinet", "special"];

export default function MinutesArchive() {
  const [search, setSearch] = useState("");
  const { minutes, loading, refetch } = useMinutes(search);
  const { user, role } = useAuth();
  const canWrite = canWriteMinutes(role);

  const [editorOpen, setEditorOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [draft, setDraft] = useState<{
    kind: MinutesKind;
    meeting_date: string;
    title: string;
    body_html: string;
    body_text: string;
  }>({
    kind: "regular",
    meeting_date: new Date().toISOString().slice(0, 10),
    title: "",
    body_html: "",
    body_text: "",
  });

  const [attendance, setAttendance] = useState<Map<string, Attendance>>(
    new Map()
  );

  const active = useMemo(
    () => minutes.find((m) => m.id === activeId) ?? null,
    [minutes, activeId]
  );

  function openNew() {
    setActiveId(null);
    setDraft({
      kind: "regular",
      meeting_date: new Date().toISOString().slice(0, 10),
      title: "",
      body_html: "",
      body_text: "",
    });
    setAttendance(new Map());
    setEditorOpen(true);
  }

  async function openExisting(row: MinutesRow) {
    setActiveId(row.id);
    setDraft({
      kind: row.kind,
      meeting_date: row.meeting_date,
      title: row.title,
      body_html: row.body_html,
      body_text: row.body_text,
    });
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("minutes_id", row.id);
    const map = new Map<string, Attendance>();
    (data ?? []).forEach((a) => map.set(a.brother_id, a as Attendance));
    setAttendance(map);
    setEditorOpen(true);
  }

  function toggleAttendance(brotherId: string, present: boolean, excused: boolean) {
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(brotherId, {
        minutes_id: activeId ?? "",
        brother_id: brotherId,
        present,
        excused,
      });
      return next;
    });
  }

  async function save() {
    if (!user) return;
    if (!draft.title.trim()) {
      toast.error("Add a title before saving.");
      return;
    }
    const payload = {
      kind: draft.kind,
      meeting_date: draft.meeting_date,
      title: draft.title,
      body_html: draft.body_html,
      body_text: draft.body_text,
      author_id: user.id,
    };
    let savedId = activeId;
    if (activeId) {
      const { error } = await supabase
        .from("minutes")
        .update(payload)
        .eq("id", activeId);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("minutes")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Failed to save");
        return;
      }
      savedId = data.id;
      setActiveId(savedId);
    }

    if (savedId) {
      const rows = Array.from(attendance.values()).map((a) => ({
        ...a,
        minutes_id: savedId!,
      }));
      if (rows.length) {
        await supabase
          .from("attendance")
          .upsert(rows, { onConflict: "minutes_id,brother_id" });
      }
    }
    toast.success("Minutes saved.");
    setEditorOpen(false);
    refetch();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Meeting Minutes
          </h1>
          <p className="text-xs text-lphie-ink/60 sm:text-sm">
            Searchable archive of regular, cabinet, and special meetings.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lphie-ink/40"
            />
            <Input
              className="pl-9"
              placeholder="Search title or body…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canWrite && (
            <Button onClick={openNew}>
              <Plus size={16} /> New minutes
            </Button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <ul className="space-y-2">
          {minutes.map((m) => (
            <li
              key={m.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-lphie-ink/5 bg-white p-4 shadow-widget hover:bg-lphie-cream/50"
              onClick={() => openExisting(m)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.kind === "special" ? "gold" : "neutral"}>
                    {m.kind}
                  </Badge>
                  <h3 className="font-semibold">{m.title}</h3>
                </div>
                <p className="text-xs text-lphie-ink/60">
                  {formatDate(m.meeting_date)}
                </p>
              </div>
              <span className="text-sm text-lphie-ink/40">View</span>
            </li>
          ))}
          {minutes.length === 0 && (
            <li className="rounded-xl border border-dashed border-lphie-ink/20 bg-white/50 p-12 text-center text-lphie-ink/50">
              No minutes archived yet.
            </li>
          )}
        </ul>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={activeId ? "Edit minutes" : "New minutes"}
        width="lg"
        footer={
          canWrite && (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save}>Save minutes</Button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Title"
              className="sm:col-span-2"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              disabled={!canWrite}
            />
            <Input
              label="Date"
              type="date"
              value={draft.meeting_date}
              onChange={(e) =>
                setDraft((d) => ({ ...d, meeting_date: e.target.value }))
              }
              disabled={!canWrite}
            />
          </div>
          <fieldset>
            <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
              Kind
            </legend>
            <div className="flex gap-3 text-sm">
              {KINDS.map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    disabled={!canWrite}
                    checked={draft.kind === k}
                    onChange={() => setDraft((d) => ({ ...d, kind: k }))}
                  />
                  {k}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
                Body
              </label>
              <MinutesEditor
                value={draft.body_html}
                onChange={(html, text) =>
                  setDraft((d) => ({ ...d, body_html: html, body_text: text }))
                }
                editable={canWrite}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
                Attendance
              </label>
              <AttendanceRoster
                attendance={attendance}
                onToggle={toggleAttendance}
                readOnly={!canWrite}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
