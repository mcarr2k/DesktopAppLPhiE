import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  MapPin,
  Plus,
  Trash2,
  Users,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useFormalPlan, currentAcademicYear } from "@/hooks/useFormal";
import { supabase } from "@/lib/supabase";
import { formatCents, parseDollarsToCents } from "@/lib/format";
import { formatDate } from "@/lib/dates";
import type { FormalChecklistItem, FormalPlan } from "@/types/db";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

const DEFAULT_CHECKLIST: FormalChecklistItem[] = [
  { title: "Confirm venue + signed contract", done: false },
  { title: "Lock in catering / menu", done: false },
  { title: "DJ or music booked", done: false },
  { title: "Send save-the-date to brothers", done: false },
  { title: "Order awards / superlatives", done: false },
  { title: "Open RSVP form", done: false },
  { title: "Coordinate transportation", done: false },
  { title: "Print program / seating chart", done: false },
];

export function AnnualFormalPlanner({ colSpan = 12 }: Props) {
  const academicYear = currentAcademicYear();
  const { plan, rsvps, loading, error, refetch } = useFormalPlan(academicYear);
  const { user, role } = useAuth();
  const canEdit = role === "vp_external" || role === "president";

  const [editOpen, setEditOpen] = useState(false);

  const dbMissing = !!error && /relation .*formal_plans.* does not exist/i.test(error);

  const headcount = useMemo(
    () => rsvps.filter((r) => r.attending).length,
    [rsvps]
  );
  const plusOnes = useMemo(
    () => rsvps.filter((r) => r.attending && r.plus_one_name).length,
    [rsvps]
  );
  const totalAttendees = headcount + plusOnes;

  async function createPlan() {
    if (!user) return;
    const { error } = await supabase.from("formal_plans").insert({
      academic_year: academicYear,
      created_by: user.id,
      checklist: DEFAULT_CHECKLIST,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Formal plan started for ${academicYear}.`);
    refetch();
  }

  async function toggleChecklistItem(idx: number) {
    if (!plan) return;
    const next = [...plan.checklist];
    next[idx] = { ...next[idx], done: !next[idx].done };
    const { error } = await supabase
      .from("formal_plans")
      .update({ checklist: next })
      .eq("id", plan.id);
    if (error) toast.error(error.message);
  }

  async function addChecklistItem(title: string) {
    if (!plan) return;
    const next = [...plan.checklist, { title, done: false }];
    const { error } = await supabase
      .from("formal_plans")
      .update({ checklist: next })
      .eq("id", plan.id);
    if (error) toast.error(error.message);
  }

  async function removeChecklistItem(idx: number) {
    if (!plan) return;
    const next = plan.checklist.filter((_, i) => i !== idx);
    const { error } = await supabase
      .from("formal_plans")
      .update({ checklist: next })
      .eq("id", plan.id);
    if (error) toast.error(error.message);
  }

  async function setMyRsvp(attending: boolean) {
    if (!user || !plan) return;
    const { error } = await supabase.from("formal_rsvps").upsert(
      {
        formal_id: plan.id,
        brother_id: user.id,
        attending,
      },
      { onConflict: "formal_id,brother_id" }
    );
    if (error) toast.error(error.message);
    else toast.success(attending ? "You're in." : "RSVP updated.");
  }

  const myRsvp = rsvps.find((r) => r.brother_id === user?.id);

  return (
    <Widget
      title="Annual Formal"
      subtitle={`${academicYear} · the chapter's flagship event`}
      colSpan={colSpan}
      actions={
        plan && canEdit ? (
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            Edit details
          </Button>
        ) : undefined
      }
    >
      {dbMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={14} /> formal_plans table not set up
          </p>
          <p className="text-xs">
            Re-run <code>supabase/schema.sql</code> followed by{" "}
            <code>supabase/policies.sql</code>.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : !plan ? (
        <div className="rounded-xl border border-dashed border-lphie-ink/15 bg-white/50 px-4 py-12 text-center">
          <Sparkles size={28} className="mx-auto mb-2 text-lphie-ink/30" />
          <p className="text-sm text-lphie-ink/60">
            No formal plan started for {academicYear}.
          </p>
          {canEdit && (
            <Button size="sm" className="mt-3" onClick={createPlan}>
              <Plus size={12} /> Start planning
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Headline + RSVP */}
          <div className="space-y-3 md:col-span-1">
            <div className="rounded-xl border border-lphie-gold/30 bg-lphie-gold/10 p-4">
              <Badge tone={plan.status === "confirmed" ? "success" : "gold"}>
                {plan.status}
              </Badge>
              {plan.theme && (
                <p className="mt-2 font-display text-lg font-bold">
                  {plan.theme}
                </p>
              )}
              <div className="mt-2 space-y-1 text-sm text-lphie-ink/80">
                {plan.event_date && (
                  <p>📅 {formatDate(plan.event_date)}</p>
                )}
                {plan.venue_name && (
                  <p className="flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span>
                      {plan.venue_name}
                      {plan.venue_address && (
                        <span className="block text-xs text-lphie-ink/60">
                          {plan.venue_address}
                        </span>
                      )}
                    </span>
                  </p>
                )}
                {plan.budget_cents != null && (
                  <p>💰 Budget: {formatCents(plan.budget_cents)}</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-lphie-ink/10 bg-white p-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lphie-ink/60">
                <Users size={12} /> Headcount
              </p>
              <p className="font-display text-3xl font-bold">{totalAttendees}</p>
              <p className="text-xs text-lphie-ink/60">
                {headcount} brothers + {plusOnes} plus-ones
                {plan.expected_headcount && ` · target ${plan.expected_headcount}`}
              </p>

              {user && (
                <div className="mt-3 border-t border-lphie-ink/5 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-lphie-ink/60">
                    My RSVP
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={myRsvp?.attending ? "primary" : "secondary"}
                      onClick={() => setMyRsvp(true)}
                    >
                      I'm in
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        myRsvp && !myRsvp.attending ? "primary" : "secondary"
                      }
                      onClick={() => setMyRsvp(false)}
                    >
                      Can't make it
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="md:col-span-2">
            <ChecklistPanel
              items={plan.checklist}
              canEdit={canEdit}
              onToggle={toggleChecklistItem}
              onAdd={addChecklistItem}
              onRemove={removeChecklistItem}
            />
          </div>
        </div>
      )}

      {plan && (
        <EditFormalModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          plan={plan}
          onSaved={refetch}
        />
      )}
    </Widget>
  );
}

function ChecklistPanel({
  items,
  canEdit,
  onToggle,
  onAdd,
  onRemove,
}: {
  items: FormalChecklistItem[];
  canEdit: boolean;
  onToggle: (idx: number) => void;
  onAdd: (title: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const done = items.filter((i) => i.done).length;
  const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  return (
    <div className="rounded-xl border border-lphie-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-lphie-ink/60">
          Planning checklist
        </p>
        <Badge tone={pct === 100 ? "success" : "neutral"}>
          {done}/{items.length}
        </Badge>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-lphie-ink/5">
        <div
          className="h-full bg-lphie-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="group flex items-center gap-2 text-sm">
            <button
              onClick={() => onToggle(idx)}
              disabled={!canEdit}
              className="shrink-0 disabled:opacity-50"
            >
              {item.done ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <Circle size={16} className="text-lphie-ink/30" />
              )}
            </button>
            <span
              className={`flex-1 ${
                item.done ? "text-lphie-ink/40 line-through" : ""
              }`}
            >
              {item.title}
            </span>
            {canEdit && (
              <button
                onClick={() => onRemove(idx)}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove"
              >
                <Trash2
                  size={12}
                  className="text-lphie-ink/40 hover:text-rose-700"
                />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) {
              onAdd(newTitle.trim());
              setNewTitle("");
            }
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a planning item…"
            className="h-8 flex-1 rounded-lg border border-lphie-ink/15 bg-white px-3 text-xs focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
          />
          <Button size="sm" type="submit" variant="secondary">
            <Plus size={12} />
          </Button>
        </form>
      )}
    </div>
  );
}

function EditFormalModal({
  open,
  onClose,
  plan,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  plan: FormalPlan;
  onSaved: () => void;
}) {
  const [theme, setTheme] = useState(plan.theme ?? "");
  const [eventDate, setEventDate] = useState(plan.event_date ?? "");
  const [venueName, setVenueName] = useState(plan.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(plan.venue_address ?? "");
  const [venueContact, setVenueContact] = useState(plan.venue_contact ?? "");
  const [budget, setBudget] = useState(
    plan.budget_cents != null ? (plan.budget_cents / 100).toFixed(2) : ""
  );
  const [headcount, setHeadcount] = useState(
    plan.expected_headcount?.toString() ?? ""
  );
  const [status, setStatus] = useState<FormalPlan["status"]>(plan.status);
  const [notes, setNotes] = useState(plan.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  // When the plan from the server changes (e.g. a teammate edited it),
  // refresh the form fields.
  useEffect(() => {
    if (!open) return;
    setTheme(plan.theme ?? "");
    setEventDate(plan.event_date ?? "");
    setVenueName(plan.venue_name ?? "");
    setVenueAddress(plan.venue_address ?? "");
    setVenueContact(plan.venue_contact ?? "");
    setBudget(plan.budget_cents != null ? (plan.budget_cents / 100).toFixed(2) : "");
    setHeadcount(plan.expected_headcount?.toString() ?? "");
    setStatus(plan.status);
    setNotes(plan.notes ?? "");
  }, [open, plan]);

  async function save() {
    setSubmitting(true);
    const { error } = await supabase
      .from("formal_plans")
      .update({
        theme: theme.trim() || null,
        event_date: eventDate || null,
        venue_name: venueName.trim() || null,
        venue_address: venueAddress.trim() || null,
        venue_contact: venueContact.trim() || null,
        budget_cents: budget ? parseDollarsToCents(budget) : null,
        expected_headcount: headcount ? Number(headcount) : null,
        status,
        notes: notes.trim() || null,
      })
      .eq("id", plan.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Formal plan updated.");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit formal plan"
      width="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} isLoading={submitting}>
            Save
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. Black tie & blue blood"
        />
        <Input
          label="Event date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
        <Input
          label="Venue name"
          className="col-span-2"
          value={venueName}
          onChange={(e) => setVenueName(e.target.value)}
        />
        <Input
          label="Venue address"
          className="col-span-2"
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
        />
        <Input
          label="Venue contact"
          value={venueContact}
          onChange={(e) => setVenueContact(e.target.value)}
          placeholder="Name + phone/email"
        />
        <Input
          label="Budget ($)"
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />
        <Input
          label="Expected headcount"
          type="number"
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
            Status
          </span>
          <select
            className="h-10 w-full rounded-lg border border-lphie-ink/15 bg-white px-3 text-sm focus:border-lphie-gold focus:outline-none focus:ring-2 focus:ring-lphie-gold/30"
            value={status}
            onChange={(e) => setStatus(e.target.value as FormalPlan["status"])}
          >
            <option value="planning">Planning</option>
            <option value="confirmed">Confirmed</option>
            <option value="done">Done</option>
          </select>
        </label>
        <Textarea
          label="Notes"
          className="col-span-2"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
