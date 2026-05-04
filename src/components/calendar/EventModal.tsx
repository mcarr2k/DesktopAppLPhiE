import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { canCreateEvent } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { toIsoLocal } from "@/lib/dates";
import type { ChapterEvent, EventVisibility } from "@/types/db";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ChapterEvent> & { starts_at?: string; ends_at?: string };
  editing?: ChapterEvent | null;
}

export function EventModal({ open, onClose, initial, editing }: Props) {
  const { user, role, isEboard } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [visibility, setVisibility] = useState<EventVisibility>("global");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const e = editing ?? (initial as ChapterEvent | undefined);
    setTitle(e?.title ?? "");
    setDescription(e?.description ?? "");
    setLocation(e?.location ?? "");
    setStartsAt(
      e?.starts_at
        ? toIsoLocal(new Date(e.starts_at))
        : toIsoLocal(new Date())
    );
    setEndsAt(
      e?.ends_at
        ? toIsoLocal(new Date(e.ends_at))
        : toIsoLocal(new Date(Date.now() + 60 * 60 * 1000))
    );
    setVisibility(
      (initial?.visibility as EventVisibility) ?? e?.visibility ?? "global"
    );
  }, [open, editing, initial]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!canCreateEvent(role, visibility)) {
      toast.error("Only e-board members can create e-board events.");
      return;
    }
    setSubmitting(true);

    const payload = {
      title,
      description: description || null,
      location: location || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      visibility,
      created_by: user.id,
    };

    const { error } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert(payload);

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Event updated." : "Event created.");
    onClose();
  }

  async function onDelete() {
    if (!editing) return;
    if (!confirm("Delete this event? This cannot be undone.")) return;
    const { error } = await supabase.from("events").delete().eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Event deleted.");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit event" : "New event"}
      width="md"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {editing && (
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button form="event-form" type="submit" isLoading={submitting}>
              {editing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      }
    >
      <form id="event-form" onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Starts"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
          <Input
            label="Ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
        <Input
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Squires Old Dominion Ballroom"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <fieldset>
          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Visibility
          </legend>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value="global"
                checked={visibility === "global"}
                onChange={() => setVisibility("global")}
              />
              Global (all members)
            </label>
            <label
              className={`flex items-center gap-2 text-sm ${!isEboard ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                value="eboard_only"
                disabled={!isEboard}
                checked={visibility === "eboard_only"}
                onChange={() => setVisibility("eboard_only")}
              />
              E-Board only
              {!isEboard && (
                <span className="text-xs text-lphie-ink/50">(officers)</span>
              )}
            </label>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
