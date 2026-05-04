import { useEffect, useState } from "react";
import { Plus, Trash2, Send, Eye, EyeOff } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useAgendas } from "@/hooks/useAgendas";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { MinutesEditor } from "@/components/minutes/MinutesEditor";
import { formatDate } from "@/lib/dates";
import type { Agenda } from "@/types/db";

const STARTER = `<h3>Call to order</h3><p>—</p>
<h3>Officer reports</h3>
<ul>
<li>President</li><li>VP Internal</li><li>VP External</li><li>Treasurer</li><li>Secretary</li>
</ul>
<h3>Old business</h3><p>—</p>
<h3>New business</h3><p>—</p>
<h3>Open floor</h3><p>—</p>
<h3>Adjournment</h3><p>—</p>`;

export function AgendaBuilder({ colSpan = 12 }: { colSpan?: 4 | 6 | 8 | 12 }) {
  const { agendas, loading, refetch } = useAgendas();
  const { role } = useAuth();
  const canWrite = role === "president" || role === "secretary";
  const [editing, setEditing] = useState<Agenda | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Widget
      title="Meeting agendas"
      subtitle="Drafted by President / Secretary; published when ready"
      colSpan={colSpan}
      actions={
        canWrite && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New agenda
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : agendas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-lphie-cream/40 p-6 text-center text-sm text-lphie-ink/60">
          No agendas yet. Drafts stay private to e-board until published.
        </div>
      ) : (
        <ul className="space-y-2">
          {agendas.slice(0, 6).map((a) => (
            <li
              key={a.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-lphie-ink/5 bg-white p-4 hover:bg-lphie-cream/50"
              onClick={() => setEditing(a)}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{a.title}</p>
                  <Badge tone={a.published ? "success" : "gold"}>
                    {a.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-lphie-ink/60">
                  {formatDate(a.meeting_date)}
                </p>
              </div>
              <span className="text-sm text-lphie-ink/40">
                {a.published ? "View" : "Edit"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <AgendaEditor
        agenda={editing}
        creating={creating}
        canWrite={canWrite}
        onClose={() => {
          setEditing(null);
          setCreating(false);
          refetch();
        }}
      />
    </Widget>
  );
}

function AgendaEditor({
  agenda,
  creating,
  canWrite,
  onClose,
}: {
  agenda: Agenda | null;
  creating: boolean;
  canWrite: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const open = !!agenda || creating;

  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [published, setPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(agenda?.title ?? "Weekly chapter meeting");
    setMeetingDate(
      agenda?.meeting_date ?? new Date().toISOString().slice(0, 10)
    );
    setBodyHtml(agenda?.body_html || STARTER);
    setBodyText(agenda?.body_text ?? "");
    setPublished(agenda?.published ?? false);
  }, [open, agenda]);

  async function save() {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Add a title.");
      return;
    }
    setSubmitting(true);
    const payload = {
      title: title.trim(),
      meeting_date: meetingDate,
      body_html: bodyHtml,
      body_text: bodyText,
      author_id: user.id,
      published,
    };
    const { error } = agenda
      ? await supabase.from("agendas").update(payload).eq("id", agenda.id)
      : await supabase.from("agendas").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Agenda saved.");
    onClose();
  }

  async function togglePublished() {
    if (!agenda) return;
    const { error } = await supabase
      .from("agendas")
      .update({ published: !agenda.published })
      .eq("id", agenda.id);
    if (error) toast.error(error.message);
    else {
      toast.success(
        agenda.published ? "Unpublished — back to draft." : "Published to chapter."
      );
      onClose();
    }
  }

  async function remove() {
    if (!agenda) return;
    if (!confirm(`Delete agenda "${agenda.title}"?`)) return;
    const { error } = await supabase
      .from("agendas")
      .delete()
      .eq("id", agenda.id);
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
      title={creating ? "New agenda" : agenda?.title ?? "Agenda"}
      width="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {agenda && canWrite && (
              <Button variant="danger" size="sm" onClick={remove}>
                <Trash2 size={14} /> Delete
              </Button>
            )}
            {agenda && canWrite && (
              <Button
                size="sm"
                variant={agenda.published ? "secondary" : "primary"}
                onClick={togglePublished}
              >
                {agenda.published ? (
                  <>
                    <EyeOff size={14} /> Unpublish
                  </>
                ) : (
                  <>
                    <Send size={14} /> Publish
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              {canWrite ? "Cancel" : "Close"}
            </Button>
            {canWrite && (
              <Button onClick={save} isLoading={submitting}>
                Save draft
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Title"
            className="sm:col-span-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canWrite}
          />
          <Input
            label="Meeting date"
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            disabled={!canWrite}
          />
        </div>
        {!canWrite && agenda && !agenda.published && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <Eye size={12} className="inline" /> Draft — only e-board can see this.
          </p>
        )}
        <MinutesEditor
          value={bodyHtml}
          onChange={(html, text) => {
            setBodyHtml(html);
            setBodyText(text);
          }}
          editable={canWrite}
        />
      </div>
    </Modal>
  );
}
