import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Plus, AlertTriangle } from "lucide-react";
import { Widget } from "@/components/shell/Widget";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import { useDirectory } from "@/hooks/useDirectory";
import { useCheckIns } from "@/hooks/useCheckIns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { currentSemester, formatDate } from "@/lib/dates";
import type { Profile } from "@/types/db";

interface Props {
  colSpan?: 4 | 6 | 8 | 12;
}

export function CheckInTracker({ colSpan = 12 }: Props) {
  const [semester, setSemester] = useState(currentSemester());
  const { user, role } = useAuth();
  const canConduct = role === "vp_internal" || role === "president";
  const { members, loading: membersLoading } = useDirectory();
  const { checkIns, loading: ciLoading, refetch } = useCheckIns(semester);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeBrother, setActiveBrother] = useState<Profile | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = useMemo(
    () =>
      members.filter((m) => m.status === "active" || m.status === "pledge"),
    [members]
  );

  const checkedIds = useMemo(
    () => new Set(checkIns.map((c) => c.brother_id)),
    [checkIns]
  );

  const overdue = active.filter((m) => !checkedIds.has(m.id));
  const completed = active.filter((m) => checkedIds.has(m.id));
  const pctDone =
    active.length === 0
      ? 0
      : Math.round((completed.length / active.length) * 100);

  function openFor(brother: Profile, existing?: typeof checkIns[number]) {
    setActiveBrother(brother);
    setNotes(existing?.notes ?? "");
    setModalOpen(true);
  }

  async function submit() {
    if (!user || !activeBrother) return;
    setSubmitting(true);
    const { error } = await supabase.from("check_ins").upsert(
      {
        brother_id: activeBrother.id,
        semester,
        conducted_by: user.id,
        notes: notes.trim() || null,
        conducted_at: new Date().toISOString(),
      },
      { onConflict: "brother_id,semester" }
    );
    setSubmitting(false);
    if (error) {
      if (error.code === "42P01") {
        toast.error(
          "check_ins table missing — re-run supabase/schema.sql in the SQL editor."
        );
      } else if (
        error.code === "42501" ||
        /row-level security/i.test(error.message)
      ) {
        toast.error(
          "RLS denied. Re-run supabase/policies.sql, then sign out and back in."
        );
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(`Logged check-in with ${activeBrother.full_name}.`);
    refetch();
    setModalOpen(false);
    setActiveBrother(null);
    setNotes("");
  }

  return (
    <Widget
      title="Brother check-ins"
      subtitle={`Once per brother per semester · ${semester}`}
      colSpan={colSpan}
      actions={
        <div className="flex items-center gap-2">
          <Input
            value={semester}
            onChange={(e) => setSemester(e.target.value.toUpperCase())}
            className="h-8 w-20 text-xs"
            placeholder="FA25"
          />
          <Badge tone={pctDone === 100 ? "success" : "gold"}>
            {completed.length}/{active.length} done
          </Badge>
        </div>
      }
    >
      {membersLoading || ciLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : active.length === 0 ? (
        <p className="text-sm text-lphie-ink/50">
          No active brothers in the directory yet.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-lphie-ink/5">
            <div
              className={`h-full transition-all ${
                pctDone === 100 ? "bg-emerald-500" : "bg-lphie-gold"
              }`}
              style={{ width: `${pctDone}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Section
              icon={<AlertTriangle size={14} className="text-amber-700" />}
              label={`Overdue (${overdue.length})`}
              accent="amber"
            >
              {overdue.length === 0 ? (
                <p className="text-xs text-lphie-ink/40">
                  Everyone is checked in for {semester}.
                </p>
              ) : (
                <ul className="divide-y divide-lphie-ink/5">
                  {overdue.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span className="font-medium">{m.full_name}</span>
                      {canConduct && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openFor(m)}
                        >
                          <Plus size={12} /> Log
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              icon={<CheckCircle2 size={14} className="text-emerald-700" />}
              label={`Done (${completed.length})`}
              accent="emerald"
            >
              {completed.length === 0 ? (
                <p className="text-xs text-lphie-ink/40">No check-ins logged yet.</p>
              ) : (
                <ul className="divide-y divide-lphie-ink/5">
                  {completed.map((m) => {
                    const ci = checkIns.find((c) => c.brother_id === m.id);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{m.full_name}</p>
                          {ci && (
                            <p className="flex items-center gap-1 text-xs text-lphie-ink/50">
                              <Clock size={10} />
                              {formatDate(ci.conducted_at)}
                            </p>
                          )}
                        </div>
                        {canConduct && ci && (
                          <button
                            onClick={() => openFor(m, ci)}
                            className="text-xs font-semibold text-lphie-accent hover:underline"
                          >
                            View / edit
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          activeBrother
            ? `Check-in · ${activeBrother.full_name}`
            : "Check-in"
        }
        width="md"
        footer={
          canConduct ? (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} isLoading={submitting}>
                Save check-in
              </Button>
            </div>
          ) : null
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-lphie-ink/60">
            Semester: <span className="font-semibold">{semester}</span>. Notes
            are visible to VP Internal and President only.
          </p>
          <Textarea
            label="Notes"
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How are they doing academically, socially, with the chapter? Any flags?"
            disabled={!canConduct}
          />
        </div>
      </Modal>
    </Widget>
  );
}

function Section({
  icon,
  label,
  accent,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  accent: "amber" | "emerald";
  children: React.ReactNode;
}) {
  const accentBorder =
    accent === "amber" ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/30";
  return (
    <div className={`rounded-xl border ${accentBorder} p-3`}>
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-lphie-ink/70">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}
