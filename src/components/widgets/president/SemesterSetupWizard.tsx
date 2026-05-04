import { useMemo, useState } from "react";
import {
  Wand2,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { addDays, addWeeks, format, isBefore, parseISO } from "date-fns";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useDirectory } from "@/hooks/useDirectory";
import { supabase } from "@/lib/supabase";
import { canManageDues } from "@/lib/permissions";
import { currentSemester } from "@/lib/dates";
import { formatCents, parseDollarsToCents } from "@/lib/format";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const SEEDED_BUDGET_LINES = [
  { kind: "income" as const, category: "Dues", projected_cents: 0 },
  { kind: "income" as const, category: "Fundraising", projected_cents: 50000 },
  { kind: "expense" as const, category: "Operations", projected_cents: 30000 },
  { kind: "expense" as const, category: "Mixers", projected_cents: 40000 },
  { kind: "expense" as const, category: "Philanthropy", projected_cents: 25000 },
  { kind: "expense" as const, category: "Awards", projected_cents: 10000 },
];

export function SemesterSetupWizard({ colSpan = 6 }: Props) {
  const { user, role } = useAuth();
  const { members } = useDirectory();
  const isPresident = role === "president";

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  // Form state
  const [semester, setSemester] = useState(currentSemester());
  const [startDate, setStartDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(addWeeks(new Date(), 14), "yyyy-MM-dd")
  );
  const [meetingDay, setMeetingDay] = useState<DayOfWeek>(2); // Tue default
  const [meetingTime, setMeetingTime] = useState("19:00");
  const [meetingDuration, setMeetingDuration] = useState(60); // minutes
  const [duesAmount, setDuesAmount] = useState("250.00");
  const [duesDueDate, setDuesDueDate] = useState(() =>
    format(addDays(new Date(), 21), "yyyy-MM-dd")
  );
  const [seedBudget, setSeedBudget] = useState(true);

  const activeBrothers = useMemo(
    () =>
      members.filter((m) => m.status === "active" || m.status === "pledge"),
    [members]
  );

  // Build the list of meeting dates between start & end on the chosen day.
  const meetingDates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (isBefore(end, start)) return [];

    // Roll start forward to the next occurrence of meetingDay.
    let cursor = new Date(start);
    while (cursor.getDay() !== meetingDay) {
      cursor = addDays(cursor, 1);
    }

    const out: Date[] = [];
    while (!isBefore(end, cursor)) {
      out.push(new Date(cursor));
      cursor = addWeeks(cursor, 1);
    }
    return out;
  }, [startDate, endDate, meetingDay]);

  const duesCents = useMemo(() => parseDollarsToCents(duesAmount) ?? 0, [
    duesAmount,
  ]);
  const totalDuesProjected = duesCents * activeBrothers.length;

  async function execute() {
    if (!user) return;
    if (!isPresident && !canManageDues(role)) {
      toast.error("Only the President or Treasurer can run setup.");
      return;
    }
    if (meetingDates.length === 0) {
      toast.error("No meeting dates fit between the start and end you picked.");
      return;
    }
    if (activeBrothers.length === 0) {
      toast.error(
        "No active brothers to invoice — add brothers in the directory first."
      );
      return;
    }

    setRunning(true);
    const errors: string[] = [];

    // 1. Insert weekly meetings as events.
    const [hh, mm] = meetingTime.split(":").map(Number);
    const eventRows = meetingDates.map((d) => {
      const start = new Date(d);
      start.setHours(hh ?? 19, mm ?? 0, 0, 0);
      const end = new Date(start.getTime() + meetingDuration * 60_000);
      return {
        title: `Chapter meeting · ${semester}`,
        description: `Weekly chapter meeting (auto-created from semester setup).`,
        location: null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        visibility: "global" as const,
        created_by: user.id,
      };
    });
    const { error: evtErr } = await supabase.from("events").insert(eventRows);
    if (evtErr) errors.push(`Meetings: ${evtErr.message}`);

    // 2. Upsert dues rows (one per active brother). The unique constraint on
    //    (brother_id, semester) means re-running is safe — it just refreshes
    //    the amount owed.
    const duesRows = activeBrothers.map((b) => ({
      brother_id: b.id,
      semester,
      amount_owed_cents: duesCents,
      amount_paid_cents: 0,
      status: "unpaid" as const,
      due_date: duesDueDate,
    }));
    const { error: duesErr } = await supabase
      .from("dues")
      .upsert(duesRows, { onConflict: "brother_id,semester" });
    if (duesErr) errors.push(`Dues: ${duesErr.message}`);

    // 3. Optionally seed budget lines. Skip categories that already exist for
    //    this semester so re-runs don't duplicate.
    if (seedBudget) {
      const { data: existing } = await supabase
        .from("budget_items")
        .select("category, kind")
        .eq("semester", semester);
      const existingKey = new Set(
        (existing ?? []).map((r: { category: string; kind: string }) => `${r.kind}:${r.category}`)
      );
      const seedRows = SEEDED_BUDGET_LINES.filter(
        (line) => !existingKey.has(`${line.kind}:${line.category}`)
      ).map((line) => ({
        ...line,
        // Auto-fill the projected dues line from the actual dues plan.
        projected_cents:
          line.category === "Dues" ? totalDuesProjected : line.projected_cents,
        semester,
        memo: line.category === "Dues" ? `${activeBrothers.length} brothers × ${formatCents(duesCents)}` : null,
        created_by: user.id,
      }));
      if (seedRows.length > 0) {
        const { error: budgetErr } = await supabase
          .from("budget_items")
          .insert(seedRows);
        if (budgetErr) errors.push(`Budget: ${budgetErr.message}`);
      }
    }

    setRunning(false);

    if (errors.length === 0) {
      toast.success(
        `Set up ${semester}: ${meetingDates.length} meetings, ${activeBrothers.length} dues, ${seedBudget ? "budget seeded" : "no budget"}.`
      );
      setOpen(false);
    } else {
      toast.error(errors.join(" · "));
    }
  }

  return (
    <Widget
      title="Semester setup wizard"
      subtitle="Calendar of events, budget, and dues — Article 4 §7"
      colSpan={colSpan}
      actions={
        isPresident && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Wand2 size={14} /> Run wizard
          </Button>
        )
      }
    >
      {!isPresident ? (
        <p className="text-sm text-lphie-ink/60">
          Only the President can run semester setup. The wizard schedules
          weekly chapter meetings, generates dues for every active brother,
          and seeds a starter budget.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Tile
            icon={<Calendar size={14} />}
            label="Weekly meetings"
            value="Auto-scheduled"
          />
          <Tile
            icon={<DollarSign size={14} />}
            label="Dues run"
            value={`${activeBrothers.length} brothers`}
          />
          <Tile
            icon={<CheckCircle2 size={14} />}
            label="Starter budget"
            value="6 line items"
          />
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Set up the semester"
        width="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={execute} isLoading={running}>
              <Wand2 size={14} /> Create everything
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Semester */}
          <Input
            label="Semester label"
            value={semester}
            onChange={(e) => setSemester(e.target.value.toUpperCase())}
            placeholder="FA25"
          />

          {/* Meeting schedule */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-lphie-ink/60">
              Weekly meetings
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Semester start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Semester end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-lphie-ink/70">
                  Meeting day
                </label>
                <div className="flex gap-1">
                  {DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setMeetingDay(d.value)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                        meetingDay === d.value
                          ? "bg-lphie-gold text-lphie-ink"
                          : "bg-lphie-ink/5 text-lphie-ink/60 hover:bg-lphie-ink/10"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Time"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
                <Input
                  label="Duration (min)"
                  type="number"
                  min={15}
                  step={15}
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(Number(e.target.value))}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-lphie-ink/60">
              Will create{" "}
              <span className="font-semibold text-lphie-ink">
                {meetingDates.length} weekly meeting{meetingDates.length === 1 ? "" : "s"}
              </span>{" "}
              between {startDate} and {endDate}.
            </p>
          </section>

          {/* Dues */}
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-lphie-ink/60">
              Dues
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount per brother ($)"
                inputMode="decimal"
                value={duesAmount}
                onChange={(e) => setDuesAmount(e.target.value)}
              />
              <Input
                label="Due date"
                type="date"
                value={duesDueDate}
                onChange={(e) => setDuesDueDate(e.target.value)}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-lphie-ink/70">
              <Users size={12} />
              <span>
                {activeBrothers.length} active/pledge brothers × {formatCents(duesCents)} ={" "}
                <span className="font-semibold text-lphie-ink">
                  {formatCents(totalDuesProjected)} projected
                </span>
              </span>
            </div>
            {activeBrothers.length === 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                <AlertTriangle size={12} /> No active brothers in directory yet.
              </p>
            )}
          </section>

          {/* Budget */}
          <section>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={seedBudget}
                onChange={(e) => setSeedBudget(e.target.checked)}
              />
              <span>
                Seed starter budget (6 income + expense lines) — Treasurer can
                edit afterward
              </span>
            </label>
          </section>

          {running && (
            <div className="flex items-center justify-center gap-2 text-sm text-lphie-ink/60">
              <Spinner size={14} /> Creating…
            </div>
          )}
        </div>
      </Modal>
    </Widget>
  );
}

function Tile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-lphie-ink/5 bg-lphie-cream/40 p-3">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-lphie-ink/60">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-semibold text-lphie-ink">{value}</p>
    </div>
  );
}
